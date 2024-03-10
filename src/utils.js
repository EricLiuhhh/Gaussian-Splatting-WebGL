// Creates the webgl context, shader program and attribute buffers
async function setupWebglContext() {
    const canvas = document.querySelector('canvas')
    const gl = canvas.getContext('webgl2')
    
    pclRenderer = new PointCloudRenderer(gl)
    ellipsoidsRenderer = new EllipsoidsRenderer(gl)
    gaussianRenderer = new GaussianRenderer(gl)
    
    // Set correct blending
    gl.disable(gl.DEPTH_TEST)
	gl.enable(gl.BLEND)
	gl.blendFunc(gl.ONE_MINUS_DST_ALPHA, gl.ONE)

    return { glContext: gl, 
             ellipsoidsRenderer: ellipsoidsRenderer,
             gaussianRenderer: gaussianRenderer,
             pclRenderer: pclRenderer }
}

function updateBuffer(gl, buffer, data){
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW)
}

function setupAttributeBuffer(gl, program, name, components, useInstance=true) {
    const location = gl.getAttribLocation(program, name)
    const buffer = gl.createBuffer()
    program[name] = location;
    buffer.components = components;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.enableVertexAttribArray(location)
    gl.vertexAttribPointer(location, components, gl.FLOAT, false, 0, 0)
    if (useInstance){
        gl.vertexAttribDivisor(location, 1)
    } else {
        gl.vertexAttribDivisor(location, 0)
    }
    return buffer
}

function bindAttributeBuffer(gl, buffer, location, useInstance=true){
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.enableVertexAttribArray(location)
    gl.vertexAttribPointer(location, buffer.components, gl.FLOAT, false, 0, 0)
    if (useInstance){
        gl.vertexAttribDivisor(location, 1)
    } else {
        gl.vertexAttribDivisor(location, 0)
    }
}

// https://webglfundamentals.org/webgl/lessons/webgl-resizing-the-canvas.html
function onCanvasResize(entries, cam, renderfunc) {
    for (const entry of entries) {
        let width, height
        let dpr = window.devicePixelRatio

        if (entry.devicePixelContentBoxSize) {
            width = entry.devicePixelContentBoxSize[0].inlineSize
            height = entry.devicePixelContentBoxSize[0].blockSize
            dpr = 1
        } else if (entry.contentBoxSize) {
            if (entry.contentBoxSize[0]) {
                width = entry.contentBoxSize[0].inlineSize
                height = entry.contentBoxSize[0].blockSize
            } else {
                width = entry.contentBoxSize.inlineSize
                height = entry.contentBoxSize.blockSize
            }
        } else {
            width = entry.contentRect.width
            height = entry.contentRect.height
        }

        canvasSize = [width * dpr, height * dpr]
    }
    
    if (cam != null) renderfunc()
}

// Create a program from a vertex and fragment shader
function createProgram(gl, vertexShaderSource, fragmentShaderSource) {
    const program = gl.createProgram()

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource)
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource)
    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)

    const success = gl.getProgramParameter(program, gl.LINK_STATUS)
    if (success) return program

    console.log(gl.getProgramInfoLog(program))
    gl.deleteProgram(program)
}

// Create and compile a shader from source
function createShader(gl, type, source) {
    const shader = gl.createShader(type)
    gl.shaderSource(shader, source)
    gl.compileShader(shader)

    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS)

    if (success) return shader

    console.log(gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
}

// Fetch a file from a path
async function fetchFile(path, type = 'text') {
    const response = await fetch(path)
    return response[type]()
}

// Hex string to [0,1] RGB array
function hexToRGB(hex) {
    const pairs = hex.match(/\w{1,2}/g)
    return [
        parseInt(pairs[0], 16) / 255,
        parseInt(pairs[1], 16) / 255,
        parseInt(pairs[2], 16) / 255
    ]
}