async function render_webgl(expr, canvas) {
    const gl = canvas.getContext('webgl');
    if (!(gl instanceof WebGLRenderingContext)) {
        throw new Error('webgl not supported')
    }

    const vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, `
        attribute vec2 aPos;
        void main() {
            gl_Position = vec4(aPos, 0.0, 1.0);
        }
    `);
    gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(vs);
        throw new Error(`vertex shader failed to compile ${log}`)
    }

    const fragment = gen_webgl_fragment(expr);
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, `
        precision highp float;
        uniform vec2 mouse;
        uniform float time;
        void main() {
            float x = gl_FragCoord.x / ${canvas.width}.0 * 2.0 - 1.0;
            float y = gl_FragCoord.y / ${canvas.width}.0 * 2.0 - 1.0;
            float mouse_x = mouse.x / ${canvas.width}.0 * 2.0 - 1.0;
            float mouse_y = mouse.y / ${canvas.width}.0 * 2.0 - 1.0;
            float t = sin(time/2.0);
            vec3 color = (${fragment} + 1.0) * 0.5;
            gl_FragColor = vec4(color, 1.0);
        }
    `);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(fs);
        throw new Error(`fragment shader failed to compile ${log}`)
    }

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const log = gl.getProgramInfoLog(program);
        throw new Error(`program failed to link: ${log}`);
    }

    const vertices = new Float32Array([
         1.0,  1.0,  // top left
         1.0, -1.0,  // top right
        -1.0,  1.0,  // bottom right
         1.0, -1.0,  // bottom left
        -1.0, -1.0,  // top left
        -1.0,  1.0,  // bottom right
    ]);
    const VBO = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, VBO);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(program, "aPos");
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, vertices.BYTES_PER_ELEMENT * 2, 0);
    gl.enableVertexAttribArray(aPos);

    let t0 = null;
    let mx = 0, my = 0;
    canvas.addEventListener('mousemove', evt => {
        const rect = evt.target.getBoundingClientRect();
        mx = evt.clientX - rect.left;
        my = evt.clientY - rect.top;
    });

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.useProgram(program);
    const mouseLoc = gl.getUniformLocation(program, "mouse");
    const timeLoc = gl.getUniformLocation(program, "time");

    function render(timestamp) {
        if (t0 === null) t0 = timestamp;
        let t = (timestamp - t0) / 1000;
        gl.uniform2f(mouseLoc, mx, my);
        gl.uniform1f(timeLoc, t);

        gl.drawArrays(gl.TRIANGLES, 0, 6);

        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
}

function gen_webgl_fragment(node) {
    switch (node.kind) {
        case NodeKind.X: return 'x';
        case NodeKind.Y: return 'y';
        case NodeKind.T: return 't';
        case NodeKind.MOUSEX: return 'mouse_x';
        case NodeKind.MOUSEY: return 'mouse_y';
        case NodeKind.NUMBER: return '' + node.number;
        case NodeKind.BOOLEAN: return '' + node.boolean;

        case NodeKind.ABS: return `abs(${gen_webgl_fragment(node.inner)})`;
        case NodeKind.ADD: return `(${gen_webgl_fragment(node.lhs)} + ${gen_webgl_fragment(node.rhs)})`;
        case NodeKind.MULT: return `(${gen_webgl_fragment(node.lhs)} * ${gen_webgl_fragment(node.rhs)})`;
        case NodeKind.MOD: return `(${gen_webgl_fragment(node.lhs)} % ${gen_webgl_fragment(node.rhs)})`;
        case NodeKind.GE: return `(${gen_webgl_fragment(node.lhs)} >= ${gen_webgl_fragment(node.rhs)})`;
        case NodeKind.TRIPLE: {
            let first = gen_webgl_fragment(node.first);
            let second = gen_webgl_fragment(node.second);
            let third = gen_webgl_fragment(node.third);
            return `vec3(${first}, ${second}, ${third})`;
        }
        case NodeKind.IF: {
            let cond = gen_webgl_fragment(node.cond);
            let then = gen_webgl_fragment(node.then);
            let elze = gen_webgl_fragment(node.elze);
            return `(float(${cond}) * (${then}) + float(!(${cond})) * (${elze}))`;
        }
        case NodeKind.RANDOM:
        case NodeKind.RULE:
            throw new Error(`Not a valid runtime kind: ${node.kind}`);
        default:
            throw new Error(`Not implemented: gen_webgl_fragment (${node.kind})`);
    }
}
