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

    const buffer = new Float32Array([0,0,0]);
    const ctxBuffer = device.createBuffer({
        label: 'ctx buffer',
        size: buffer.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
    });
    device.queue.writeBuffer(ctxBuffer, 0, buffer);

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

    let t1 = new Date().getTime();
    let mx = 0, my = 0;
    canvas.addEventListener('mousemove', evt => {
        const rect = evt.target.getBoundingClientRect();
        mx = evt.clientX - rect.left;
        my = evt.clientY - rect.top;
    });
    
    function render_pass() {
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

        let t2 = new Date().getTime();
        let t = (t2 - t1) / 1000;
        device.queue.writeBuffer(ctxBuffer, 0, new Float32Array([mx,my,t]));

        const commandBuffer = encoder.finish();
        device.queue.submit([commandBuffer]);

        requestAnimationFrame(render_pass);
    }

    requestAnimationFrame(render_pass);
}
