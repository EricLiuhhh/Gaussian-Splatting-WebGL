class GaussianRenderer {
    constructor(gl){
        this._gl = gl
        this.initRenderer()
    };
    requestUpdateBuffers = (newData) => {
        const _updateBuffer = (buffer, data) => {
            updateBuffer(this._gl, buffer, data)
        }
        _updateBuffer(this._buffers.color, newData.colors)
        _updateBuffer(this._buffers.center, newData.positions)
        _updateBuffer(this._buffers.opacity, newData.opacities)
        _updateBuffer(this._buffers.covA, newData.cov3Da)
        _updateBuffer(this._buffers.covB, newData.cov3Db)
    }

    bindBuffers = () => {
        const _bindBuffer = (buffer, location) => {
            bindAttributeBuffer(this._gl, buffer, location)
        }
        _bindBuffer(this._buffers.color, this._program.a_col)
        _bindBuffer(this._buffers.center, this._program.a_center)
        _bindBuffer(this._buffers.opacity, this._program.a_opacity)
        _bindBuffer(this._buffers.covA, this._program.a_covA)
        _bindBuffer(this._buffers.covB, this._program.a_covB)
    }

    initRenderer = async () => {
        // Load shaders
        let vertexShaderSource;
        let fragmentShaderSource;
        vertexShaderSource = await fetchFile('shaders/splat_vertex.glsl')
        fragmentShaderSource = await fetchFile('shaders/splat_fragment.glsl')

        // Create shader program
        this._program = createProgram(this._gl, vertexShaderSource, fragmentShaderSource)
        const _setupAttributeBuffer = (name, component) => {
            return setupAttributeBuffer(this._gl, this._program, name, component)
        }
    
        // Create attribute buffers
        this._buffers = {
            color: _setupAttributeBuffer('a_col', 3),
            center: _setupAttributeBuffer('a_center', 3),
            opacity: _setupAttributeBuffer('a_opacity', 1),
            covA: _setupAttributeBuffer('a_covA', 3),
            covB: _setupAttributeBuffer('a_covB', 3)
        }
    }

    render = (cam, maxGaussians, scalingModifier, showDepth, sceneMin, sceneMax) => {
        const program = this._program
        const gl = this._gl

        gl.useProgram(program)
        this.bindBuffers()
        
        const W = gl.canvas.width
        const H = gl.canvas.height
        const tan_fovy = Math.tan(cam.fov_y * 0.5)
        const tan_fovx = tan_fovy * W / H
        const focal_y = H / (2 * tan_fovy)
        const focal_x = W / (2 * tan_fovx)

        gl.uniform1f(gl.getUniformLocation(program, 'W'), W)
        gl.uniform1f(gl.getUniformLocation(program, 'H'), H)
        gl.uniform1f(gl.getUniformLocation(program, 'focal_x'), focal_x)
        gl.uniform1f(gl.getUniformLocation(program, 'focal_y'), focal_y)
        gl.uniform1f(gl.getUniformLocation(program, 'tan_fovx'), tan_fovx)
        gl.uniform1f(gl.getUniformLocation(program, 'tan_fovy'), tan_fovy)
        gl.uniform1f(gl.getUniformLocation(program, 'scale_modifier'), scalingModifier)
        gl.uniform3fv(gl.getUniformLocation(program, 'boxmin'), sceneMin)
        gl.uniform3fv(gl.getUniformLocation(program, 'boxmax'), sceneMax)
        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'projmatrix'), false, cam.vpm)
        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'viewmatrix'), false, cam.vm)

        // Custom parameters
        gl.uniform1i(gl.getUniformLocation(program, 'show_depth_map'), showDepth)

        // Draw
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, maxGaussians)
        gl.useProgram(null)
    }
}