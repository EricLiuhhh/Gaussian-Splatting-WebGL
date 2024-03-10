class EllipsoidsRenderer {
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
        _updateBuffer(this._buffers.scale, newData.scales)
        _updateBuffer(this._buffers.rot, newData.rotations)
    }

    bindBuffers = () => {
        const _bindBuffer = (buffer, location) => {
            bindAttributeBuffer(this._gl, buffer, location)
        }
        _bindBuffer(this._buffers.color, this._program.a_col)
        _bindBuffer(this._buffers.center, this._program.a_center)
        _bindBuffer(this._buffers.opacity, this._program.a_opacity)
        _bindBuffer(this._buffers.scale, this._program.a_scale)
        _bindBuffer(this._buffers.rot, this._program.a_rot)
    }

    initRenderer = async () => {
        // Load shaders
        let vertexShaderSource;
        let fragmentShaderSource;
        vertexShaderSource = await fetchFile('shaders/gaussian_surface_vert.glsl')
        fragmentShaderSource = await fetchFile('shaders/gaussian_surface_frag.glsl')

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
            scale: _setupAttributeBuffer('a_scale', 3),
            rot: _setupAttributeBuffer('a_rot', 4)
        }
    }

    render = (stage, alphaLimit, cam, maxGaussians) => {
        const program = this._program
        const gl = this._gl

        gl.useProgram(program)
        this.bindBuffers()
        gl.uniform1i(gl.getUniformLocation(program, 'stage'), stage)
        gl.uniform1f(gl.getUniformLocation(program, 'alpha_limit'), alphaLimit)
        gl.uniform3fv(gl.getUniformLocation(program, 'rayOrigin'), cam.pos)
        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'MVP'), false, cam.vpm)        
        // Ellipsoids
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 36, maxGaussians);
        //gl.useProgram(null)
    }
}