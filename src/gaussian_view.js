class GaussianView {
    initView = async () => {
        const { glContext, ellipsoidsRenderer, gaussianRenderer, pclRenderer } = await setupWebglContext()
        this._gl = glContext
        this.renderers.gaussianRenderer = gaussianRenderer
        this.renderers.ellipsoidsRenderer = ellipsoidsRenderer
        this.renderers.pclRenderer = pclRenderer
        this.cam = null
        this.isWorkerSorting = false
        this.renderFrameRequest = null
        this.renderTimeout = null
            
        const gl = glContext
        if (gl == null) {
            document.querySelector('#loading-text').style.color = `red`
            document.querySelector('#loading-text').textContent = `Could not initialize the WebGL context.`
            throw new Error('Could not initialize WebGL')
        }
    
        // Setup web worker for multi-threaded sorting
        this._worker = new Worker('src/worker-sort.js')
    
        // Event that receives sorted gaussian data from the worker
        this._worker.onmessage = e => {
            const { data, sortTime } = e.data
    
            if (getComputedStyle(document.querySelector('#loading-container')).opacity != 0) {
                document.querySelector('#loading-container').style.opacity = 0
                this.cam.disableMovement = false
            }
            
            this._cache_data = data
            this.requestUpdateBuffers(data)
            
            // Needed for the gizmo renderer
            // positionBuffer = buffers.center
            // positionData = data.positions
            // opacityData = data.opacities
    
            this.settings.sortTime = sortTime
    
            this.isWorkerSorting = false
            this.requestRender()
        }
    
        // Setup GUI
        const {gui, controllers} = initGUI(this)
        this._gui = gui, this._gui_controllers = controllers

        // Handle canvas resize
        const _onCanvasResize = (entries) => {
            onCanvasResize(entries, this.cam, this.requestRender)
        }
        const resizeObserver = new ResizeObserver(_onCanvasResize)
        resizeObserver.observe(canvas, {box: 'content-box'})
    }

    // Load a .ply scene specified as a name (URL fetch) or local file
    loadScene = async (file) => {
        const gl = this._gl
        const cam = this.cam
        gl.clearColor(0, 0, 0, 0)
        gl.clear(gl.COLOR_BUFFER_BIT)
        if (cam) cam.disableMovement = true
        document.querySelector('#loading-container').style.opacity = 1

        let reader, contentLength

        // Create a StreamableReader from a URL Response object
        if (typeof(file) == 'string' && file.includes('https')) {
            const response = await fetch(file)
            contentLength = parseInt(response.headers.get('content-length'))
            reader = response.body.getReader()
        }
        // Create a StreamableReader from a File object
        else if (file != null) {
            contentLength = file.size
            reader = file.stream().getReader()
            this.settings.defaultScene = 'null'
        }
        else
            throw new Error('No scene or file specified')

        // Download .ply file and monitor the progress
        const content = await downloadPly(reader, contentLength)

        // Load and pre-process gaussian data from .ply file
        const data = await loadPly(content.buffer)
        const gaussianCount = data.gaussianCount
        this.sceneMin = data.sceneMin, this.sceneMax = data.sceneMax

        // Send gaussian data to the worker
        this._worker.postMessage({ gaussians: {
            ...data
        } })

        // Setup camera
        let cameraParameters = {}
        if (this.settings.defaultScene !== 'null') {
            cameraParameters = this.defaultCameraParameters[this.settings.defaultScene]
        }
            
        if (cam == null) this.cam = new Camera(gl.canvas, this._gui_controllers.camController, this.requestRender, this.settings.camSettings, cameraParameters)
        else this.cam.setParameters(cameraParameters)
        this.cam.update()
        this.updateWorker()

        // Update GUI
        let maxGaussianController = this._gui_controllers.maxGaussians
        this.settings.maxGaussians = Math.min(this.settings.maxGaussians, gaussianCount)
        maxGaussianController.max(gaussianCount)
        maxGaussianController.updateDisplay()
    }

    updateWorker() {
        // Sort the splats as soon as the worker is available
        if (this.cam.needsWorkerUpdate && !this.isWorkerSorting) {
            this.cam.needsWorkerUpdate = false
            this.isWorkerSorting = true
            this._worker.postMessage({
                viewMatrix:  this.cam.vpm, 
                maxGaussians: this.settings.maxGaussians,
                sortingAlgorithm: this.settings.sortingAlgorithm
            })
        }
    }

    requestRender = (...params) => {
        let renderFrameRequest = this.renderFrameRequest
        if (renderFrameRequest != null) 
            cancelAnimationFrame(renderFrameRequest)
    
        renderFrameRequest = requestAnimationFrame(() => this.render(...params)) 
    }

    // Render a frame on the canvas
    render = (width, height, res) => {
        const gl = this._gl
        const cam = this.cam
        // Update canvas size
        const resolution = res ?? this.settings.renderResolution
        const canvasWidth = width ?? Math.round(canvasSize[0] * resolution)
        const canvasHeight = height ?? Math.round(canvasSize[1] * resolution)

        if (gl.canvas.width != canvasWidth || gl.canvas.height != canvasHeight) {
            gl.canvas.width = canvasWidth
            gl.canvas.height = canvasHeight
        }

        // Setup viewport
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
        gl.clearColor(0, 0, 0, 0)
        gl.clear(gl.COLOR_BUFFER_BIT)

        // Update camera
        cam.update()
        this.updateWorker()
        
        const showType = this.settings.showType
        if (showType === 'Gaussians'){
            this.renderers.gaussianRenderer.render(cam, this.settings.maxGaussians, this.settings.scalingModifier, this.settings.debugDepth, this.sceneMin, this.sceneMax)
        } else if (showType === 'Ellipsoids'){
            this.renderers.ellipsoidsRenderer.render(0, 0.2, cam, this.settings.maxGaussians)
        } else if (showType === 'PointCloud') {
            this.renderers.pclRenderer.render(cam, this.settings.pointSize, 1.0, null, this.settings.maxGaussians)
        } else {
            throw Error('showType Error')
        }

        // Draw gizmo
        // gizmoRenderer.render()

        this.renderFrameRequest = null

        // Progressively draw with higher resolution after the camera stops moving
        let nextResolution = Math.floor(resolution * 4 + 1) / 4
        if (nextResolution - resolution < 0.1) nextResolution += .25

        if (nextResolution <= 1 && !cam.needsWorkerUpdate && !this.isWorkerSorting) {
            const nextWidth = Math.round(canvasSize[0] * nextResolution)
            const nextHeight = Math.round(canvasSize[1] * nextResolution)

            if (this.renderTimeout != null) 
                clearTimeout(this.renderTimeout)

                this.renderTimeout = setTimeout(() => this.requestRender(nextWidth, nextHeight, nextResolution), 200)
        }
    }

    requestUpdateBuffers = (data) => {
        if (this.settings.showType === 'Ellipsoids') {
            this.renderers.ellipsoidsRenderer.requestUpdateBuffers(data)
        } else if (this.settings.showType === 'Gaussians') {
            this.renderers.gaussianRenderer.requestUpdateBuffers(data)
        } else if (this.settings.showType === 'PointCloud') {
            this.renderers.pclRenderer.requestUpdateBuffers(data)
        }
        else {
            throw new Error('showType Error')
        }
    }

    switchDataType = () => {
        this.requestUpdateBuffers(this._cache_data)
        this.requestRender()
    }

    renderers = {
        gaussianRenderer: null,
        ellipsoidsRenderer: null,
        pclRenderer: null
    }

    settings = {
        defaultScene:'null',
        renderResolution: 0.2,
        maxGaussians: 10,
        scalingModifier: 1,
        pointSize: 1.0,
        sortingAlgorithm: 'count sort',
        bgColor: '#000000',
        fov: 47,
        debugDepth: false,
        showType: 'PointCloud',
        alphaLimit: 0.2,
        camSettings: {
            speed: 0.07,
            freeFly: false,
        },
        sortTime: 'NaN',
        uploadFile: () => document.querySelector('#input').click(),
    
        // Camera calibration
        calibrateCamera: () => {},
        finishCalibration: () => {},
        showGizmo: false
    }

    defaultCameraParameters = {
        'null': {
            size: '0mb'
        },
        'room': {
            up: [0, 0.886994, 0.461779],
            target: [-0.428322434425354, 1.2004123210906982, 0.8184626698493958],
            camera: [4.950796326794864, 1.7307963267948987, 2.5],
            defaultCameraMode: 'freefly',
            size: '270mb'
        },
        'building': {
            up: [0, 0.968912, 0.247403],
            target: [-0.262075, 0.76138, 1.27392],
            camera: [ -1.1807959999999995, 1.8300000000000007, 3.99],
            defaultCameraMode: 'orbit',
            size: '326mb'
        },
        'garden': {
            up: [0.055540, 0.928368, 0.367486],
            target: [0.338164, 1.198655, 0.455374],
            defaultCameraMode: 'orbit',
            size: '1.07gb [!]'
        }
    }
}

const view = new GaussianView()
window.onload = view.initView