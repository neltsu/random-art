async function render_wgpu(fragment, canvas) {
    const adapter = await navigator.gpu?.requestAdapter();
    const device = await adapter?.requestDevice();
    if (!device) {
        throw new Error('need a browser that supports wgpu');
    }

    const context = canvas.getContext('webgpu');
    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
        device,
        format: presentationFormat,
    });

    const module = device.createShaderModule({
        label: 'random art shader',
        code: `
            @vertex fn vs(
                @builtin(vertex_index) vertexIndex : u32
            ) -> @builtin(position) vec4f {
                let pos = array(
                    vec2f(-1.0,  1.0),  // top left
                    vec2f( 1.0,  1.0),  // top right
                    vec2f( 1.0, -1.0),  // bottom right
                    vec2f(-1.0, -1.0),  // bottom left
                    vec2f(-1.0,  1.0),  // top left
                    vec2f( 1.0, -1.0)   // bottom right
                );
                return vec4f(pos[vertexIndex], 0.0, 1.0);
            }

            struct Context {
                mouse_x: f32,
                mouse_y: f32,
                time: f32,
            }

            @group(0) @binding(0) var<storage> ctx: Context;

            @fragment fn fs(@builtin(position) pos : vec4f) -> @location(0) vec4f {
                let x = pos.x / ${canvas.width} * 2.0 - 1.0;
                let y = pos.y / ${canvas.height} * 2.0 - 1.0;
                let mouse_x = ctx.mouse_x / ${canvas.width} * 2.0 - 1.0;
                let mouse_y = ctx.mouse_y / ${canvas.height} * 2.0 - 1.0;
                let t = sin(ctx.time/2);
                let color = (${fragment} + 1.0) * 0.5;
                return vec4f(color, 1.0);
            }
        `,
    });

    const ctxArray = new Float32Array([0,0,0]);
    const ctxBuffer = device.createBuffer({
        label: 'ctx buffer',
        size: ctxArray.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
    });
    device.queue.writeBuffer(ctxBuffer, 0, ctxArray);

    const bindGroupLayout = device.createBindGroupLayout({
        label: 'bind group layout for ctx buffer',
        entries: [
            { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } },
        ],
    });
    const bindGroup = device.createBindGroup({
        label: 'bind group for ctx buffer',
        layout: bindGroupLayout,
        entries: [
            { binding: 0, resource: { buffer: ctxBuffer } },
        ],
    });

    const pipelineLayout = device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout],
    });
    const pipeline = device.createRenderPipeline({
        label: 'render pipeline',
        layout: pipelineLayout,
        vertex: {
            entryPoint: 'vs',
            module,
        },
        fragment: {
            entryPoint: 'fs',
            module,
            targets: [{ format: presentationFormat }],
        },
    });

    let t0 = null;
    let mx = 0, my = 0;
    canvas.addEventListener('mousemove', evt => {
        const rect = evt.target.getBoundingClientRect();
        mx = evt.clientX - rect.left;
        my = evt.clientY - rect.top;
    });
    
    function render_pass(timestamp) {
        const renderPassDescriptor = {
            label: 'render pass',
            colorAttachments: [
                {
                    view: context.getCurrentTexture().createView(),
                    clearValue: [0.3, 0.3, 0.3, 1],
                    loadOp: 'clear',
                    storeOp: 'store',
                },
            ],
        };
    
        const encoder = device.createCommandEncoder({ label: 'encoder' });
        const pass = encoder.beginRenderPass(renderPassDescriptor);

        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.draw(6);
        pass.end();

        if (t0 === null) t0 = timestamp;
        let t = (timestamp - t0) / 1000;
        ctxArray[0] = mx;
        ctxArray[1] = my;
        ctxArray[2] = t;
        device.queue.writeBuffer(ctxBuffer, 0, ctxArray);

        const commandBuffer = encoder.finish();
        device.queue.submit([commandBuffer]);

        requestAnimationFrame(render_pass);
    }

    requestAnimationFrame(render_pass);
}

function gen_fragment_expr(node) {
    switch (node.kind) {
        case NodeKind.X: return 'x';
        case NodeKind.Y: return 'y';
        case NodeKind.T: return 't';
        case NodeKind.MOUSEX: return 'mouse_x';
        case NodeKind.MOUSEY: return 'mouse_y';
        case NodeKind.NUMBER: return '' + node.number;
        case NodeKind.BOOLEAN: return '' + node.boolean;

        case NodeKind.ABS: return `abs(${gen_fragment_expr(node.inner)})`;
        case NodeKind.ADD: return `(${gen_fragment_expr(node.lhs)} + ${gen_fragment_expr(node.rhs)})`;
        case NodeKind.MULT: return `(${gen_fragment_expr(node.lhs)} * ${gen_fragment_expr(node.rhs)})`;
        case NodeKind.MOD: return `(${gen_fragment_expr(node.lhs)} % ${gen_fragment_expr(node.rhs)})`;
        case NodeKind.GE: return `(${gen_fragment_expr(node.lhs)} >= ${gen_fragment_expr(node.rhs)})`;
        case NodeKind.TRIPLE: {
            let first = gen_fragment_expr(node.first);
            let second = gen_fragment_expr(node.second);
            let third = gen_fragment_expr(node.third);
            return `vec3f(${first}, ${second}, ${third})`;
        }
        case NodeKind.IF: {
            let cond = gen_fragment_expr(node.cond);
            let then = gen_fragment_expr(node.then);
            let elze = gen_fragment_expr(node.elze);
            return `(f32(${cond}) * (${then}) + f32(!(${cond})) * (${elze}))`;
        }
        case NodeKind.RANDOM:
        case NodeKind.RULE:
            throw new Error(`Not a valid runtime kind: ${node.kind}`);
        default:
            throw new Error(`Not implemented: gen_fragment_expr (${node.kind})`);
    }
}
