class PointCloudRenderer {
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
    }

    bindBuffers = () => {
        const _bindBuffer = (buffer, location) => {
            bindAttributeBuffer(this._gl, buffer, location, false)
        }
        _bindBuffer(this._buffers.color, this._program.in_color)
        _bindBuffer(this._buffers.center, this._program.in_vertex)
    }

    initRenderer = async () => {
        // Load shaders
        let vertexShaderSource;
        let fragmentShaderSource;
        vertexShaderSource = await fetchFile('shaders/alpha_points_vert.glsl')
        fragmentShaderSource = await fetchFile('shaders/alpha_points_frag.glsl')

        // Create shader program
        this._program = createProgram(this._gl, vertexShaderSource, fragmentShaderSource)

        const _setupAttributeBuffer = (name, component) => {
            return setupAttributeBuffer(this._gl, this._program, name, component, false)
        }
    
        // Create attribute buffers
        this._buffers = {
            center: _setupAttributeBuffer('in_vertex', 3),
            color: _setupAttributeBuffer('in_color', 3)
        }
    }

    render = (cam, radius, alpha, userColor, maxGaussians) => {
        const program = this._program
        const gl = this._gl

        gl.useProgram(program)
        this.bindBuffers()
        gl.uniform1f(gl.getUniformLocation(program, 'radius'), radius)
        gl.uniform1f(gl.getUniformLocation(program, 'alpha'), alpha)
        //gl.uniform3fv(gl.getUniformLocation(program, 'user_color'), userColor)
        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'MVP'), false, cam.vpm)        
        gl.drawArrays(gl.POINTS, 0, maxGaussians)
        // gl.useProgram(null)
        // gl.bindBuffer(gl.ARRAY_BUFFER, null)
    }
}