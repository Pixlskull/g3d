<template>
  <div id="parentContainer">
    <div id="stats" ref="statsContainer"></div>
    <div id="gui-container" ref="guiContainer"></div>
    <div id="canvasContainer" ref="canvasContainer"></div>
  </div>
</template>

<script>
// import Vue from 'vue'
import { mapState } from 'vuex'
import * as THREE from 'three'
// import OrbitControls from 'three-orbitcontrols'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import {
  CSS2DRenderer,
  CSS2DObject
} from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import Stats from 'stats-js'
import * as dat from 'dat.gui'
import html2canvas from 'html2canvas'
import { parseRegionString } from '../helper'
import _ from "lodash"
import {
  getSplines,
  getBallMesh,
  getTubeMesh,
  getLineMesh,
  getHighlightTubeMesh,
  getHighlightBallMesh,
  getHighlightLineMesh,
} from '@/components/Tube'
// import { clearScene } from '@/helper'

/**
 * this calss is from https://threejsfundamentals.org/threejs/lessons/threejs-picking.html
 */
// class PickHelper {
//   constructor() {
//     this.raycaster = new THREE.Raycaster()
//     this.pickedObject = null
//   }
//   pick(normalizedPosition, pickTargets, camera) {
//     // restore the color if there is a picked object
//     if (this.pickedObject) {
//       this.pickedObject.scale.set(1, 1, 1)
//       this.pickedObject = undefined
//     }

//     // cast a ray through the frustum
//     this.raycaster.setFromCamera(normalizedPosition, camera)
//     // get the list of objects the ray intersected
//     const intersectedObjects = this.raycaster.intersectObjects(pickTargets)
//     if (intersectedObjects.length) {
//       // pick the first object. It's the closest one
//       this.pickedObject = intersectedObjects[0].object
//       // save its color
//       console.log(this.pickedObject)
//       this.pickedObject.scale.set(1.1, 1.1, 1.1)
//     }
//   }
// }

export default {
  name: 'ThreeScene',
  data() {
    return {
      canvas: null,
      scene: null,
      container: null,
      camera: null,
      renderer: null,
      controls: null,
      stats: null,
      gui: null,
      splines: null, // key, chr or region, mat or pat, value, {spine: spline object in Three, color: color}
      mesh: null, //single model mode
      meshes: {}, // all models mode, key: region, value: Mesh obj
      binormal: new THREE.Vector3(),
      normal: new THREE.Vector3(),
      parent: null,
      splineCamera: null,
      cameraHelper: null,
      cameraEye: null,
      meshGeometry: null,
      meshMaterial: null,
      labelRenderer: null,
      labelControls: null,
      // pickPosition: { x: 0, y: 0 },
      // pickHelper: new PickHelper(),
      domEvents: null,
      params: {
        region: '',
        regionStart: null,
        regionEnd: null,
        regionBoundaries: {},
        previousSplines: {},
        shape: 'line',
        lineWidth: 1,
        color: '',
        animationView: false,
        lookAhead: false,
        cameraHelper: false,
        scale: 1,
        speed: 1,
        zooming: false,
        cameraDistance: null,
        cameraZoom: 1,
        cameraZoomThreshold: [400, 150, -1],
        cameraZoomResolution: [20000, 60000, 200000],
        dynamicResolution: true,
        dRFunction: null,
        sceneColor: 0x00000,
        screenshot: null,
        showAll: false,
        displayLabels: true,
        selectedMeshChrom: null,
        previousSelected: null,
        unSelectMesh: null,
        displayRegion: null,
        highlight: false,
        highlightIndex: null,
        highlightStart: 0,
        highlightEnd: 0,
        highlightColor: 'rgb(255, 255, 0)',
      }
    }
  },
  computed: mapState(['g3d', 'data3d']),
  methods: {
    init() {
      this.container = this.$refs.canvasContainer
      this.scene = new THREE.Scene()
      //   this.scene.background = new THREE.Color(0x8fbcd4)
      // this.scene.background = new THREE.Color(0xf0f0f0)
      const axes = new THREE.AxesHelper(50)
      this.scene.add(axes)
      this.stats = new Stats()
      this.stats.showPanel(0)
      this.stats.dom.style.position = 'absolute'
      this.$refs.statsContainer.appendChild(this.stats.dom)
      // const light = new THREE.DirectionalLight(0xffffff)
      // light.position.set(0, 0, 1)
      // this.scene.add(light)
      this.parent = new THREE.Object3D()
      this.scene.add(this.parent)
      this.createCamera()
      this.createControls()
      this.createLights()
      this.createRenderer()
      // start the animation loop
      this.renderer.setAnimationLoop(() => {
        this.update()
        this.render()
      })
    },
    createCamera() {
      const containerWidth = this.container.clientWidth
      const containerHeight = this.container.clientHeight
      const aspect = containerWidth / containerHeight
      this.camera = new THREE.PerspectiveCamera(
        50, // FOV
        aspect, // aspect
        0.1, // near clipping plane
        10000 // far clipping plane
      )

      this.camera.position.set(0, 50, 200)

      this.splineCamera = new THREE.PerspectiveCamera(84, aspect, 0.01, 1000)
      this.parent.add(this.splineCamera)

      this.cameraHelper = new THREE.CameraHelper(this.splineCamera)
      this.scene.add(this.cameraHelper)

      this.cameraEye = new THREE.Mesh(
        new THREE.SphereBufferGeometry(1),
        new THREE.MeshBasicMaterial({ color: 0xdddddd })
      )
      this.parent.add(this.cameraEye)

      this.cameraHelper.visible = this.params.cameraHelper
      this.cameraEye.visible = this.params.cameraHelper
    },
    createControls() {
      this.controls = new OrbitControls(this.camera, this.container)
      if (this.params.dynamicResolution) {
        this.params.cameraDistance = this.controls.object.position.distanceTo(
          this.controls.target
        )
        this.params.dRFunction = _.debounce(this.dynamicResolution.bind(this), 100)
        this.controls.addEventListener("change", this.params.dRFunction)
      }
    },
    toggleDynamicResolution() {
      console.log(this.params.dynamicResolution)
      if (this.params.dynamicResolution) {
        this.params.cameraDistance = this.controls.object.position.distanceTo(
          this.controls.target
        )
        this.params.dRFunction = _.debounce(this.dynamicResolution.bind(this), 100)
        this.controls.addEventListener("change", this.params.dRFunction)
      } else {
        console.log(this.params.dRFunction)
        this.controls.removeEventListener("change", this.params.dRFunction)
      }
    },
    dynamicResolution(e) {
      if (!this.$store.state.isLoading) {
        this.params.zooming = true;
        this.params.cameraDistance = e.target.object.position.distanceTo(
          e.target.target
        )
        const zoom = _.findIndex(
          this.params.cameraZoomThreshold,
          zoom => this.params.cameraDistance > zoom
        )
        if (zoom !== this.params.cameraZoom) {
          this.params.cameraZoom = zoom
          this.$store.dispatch(
            "fetchDataDynamicResolution",
            this.params.cameraZoomResolution[this.params.cameraZoom]
          )
        }
      }
    },
    createLights() {
      const ambientLight = new THREE.HemisphereLight(
        0xddeeff, // sky color
        0x202020, // ground color
        8 // intensity
      )

      const mainLight = new THREE.DirectionalLight(0xffffff, 5)
      mainLight.position.set(10, 10, 10)

      this.scene.add(ambientLight, mainLight)
    },
    createRenderer() {
      this.renderer = new THREE.WebGLRenderer({ antialias: true })
      this.renderer.setSize(
        this.container.clientWidth,
        this.container.clientHeight
      )

      this.renderer.setPixelRatio(window.devicePixelRatio)
      this.container.appendChild(this.renderer.domElement)

      // label renderer
      this.labelRenderer = new CSS2DRenderer()
      this.labelRenderer.setSize(
        this.container.clientWidth,
        this.container.clientHeight
      )
      this.labelRenderer.domElement.style.position = 'absolute'
      this.labelRenderer.domElement.style.top = 0
      // this.labelRenderer.domElement.id = 'labelDiv' // for by pass mouse events
      this.container.appendChild(this.labelRenderer.domElement)
      // this.labelControls = new OrbitControls(
      //   this.camera,
      //   this.labelRenderer.domElement
      // )
    },
    updateGui() {
      if (this.gui) {
        this.$refs.guiContainer.removeChild(this.gui.domElement)
        this.gui.destroy()
      }
      this.gui = new dat.GUI({ autoPlace: false })
      this.$refs.guiContainer.appendChild(this.gui.domElement)
      const chroms = Object.keys(this.splines)

      this.gui
        .addColor(this.params, 'sceneColor')
        .name('Background')
        .listen()
        .onChange(e => (this.scene.background = new THREE.Color(e)))
      this.gui
        .add(this.params, 'dynamicResolution')
        .name('Dynamic Resolution Change')
        .onChange(() => this.toggleDynamicResolution())
      this.gui
        .add(this.params, 'displayLabels')
        .name('Show label')
        .onChange(() => this.toggleLabelDisplay())
      this.gui
        .add(this.params, 'showAll')
        .name('Show all')
        .onChange(() => this.toggleAllMode())
      if (
        this.params.displayRegion === "wholeGenome" ||
        this.params.displayRegion === "wholeChromosome"
      ) {
        const highlightFolder = this.gui.addFolder('Highlighting')
        const start = this.params.regionStart
        const end = this.params.regionEnd
        highlightFolder
          .add(this.params, 'highlight')
          .name('Highlight')
          .onChange(() => this.updateHighlight())
        if (this.params.showAll) {
          highlightFolder.add(this.params, "region", chroms).onChange(() => {
            this.resetHighlightParams()
            this.updateGui()
            this.addAllShapes(this.params)
          })
        }
        highlightFolder
          .add(this.params, 'highlightStart', start, end, 1)
          .name('Start')
          .onChange(() => this.updateHighlight())
        highlightFolder
          .add(this.params, 'highlightEnd', start, end, 1)
          .name('End')
          .onChange(() => this.updateHighlight())
        highlightFolder
          .addColor(this.params, 'highlightColor')
          .listen()
          .onChange(e => {
            this.setHighlightMaterialColor(e)
          })
        highlightFolder.open()
      }
      const folderGeometry = this.gui.addFolder('Regions')
      if (this.params.showAll) {
        Object.keys(this.splines).forEach(chrom => {
          const colorKey = `color_${chrom}`
          folderGeometry
            .addColor(this.params, colorKey)
            .listen()
            .name(chrom)
            .onChange(e => {
              if (this.meshes[chrom]) {
                //this.meshes[chrom].material.color.setStyle(e)
                this.setMeshesMaterialColor(chrom, e)
              }
            })
        })
        const displayControl = this.gui.addFolder('Display')
        Object.keys(this.splines).forEach(chrom => {
          const displayKey = `display_${chrom}`
          displayControl
            .add(this.params, displayKey)
            .name(chrom)
            .onChange(val => {
              this.meshes[chrom].visible = val
              this.meshes[chrom].children.forEach(
                child => (child.visible = val)
              )
            })
        })
        this.gui
          .add(this.params, 'shape', {
            Line: 'line',
            Tube: 'tube',
            Ball: 'ball'
          })
          .name('Shape')
          .onChange(() => this.addAllShapes(this.params))
        const lineControls = this.gui.addFolder('Line Controls')
        lineControls
          .add(this.params, 'lineWidth', 1, 10)
          .onChange(() => this.addAllShapes(this.params))
      } else {
        // this.params.color = this.meshMaterial.color.getStyle()
        this.params.color = this.getMeshMaterialColor()
        folderGeometry.add(this.params, 'region', chroms).onChange(() => {
          if (
            this.params.displayRegion === "wholeGenome" ||
            this.params.displayRegion === "wholeChromosome"
          ) {
            this.resetHighlightParams()
            this.updateGui()
          }
          this.addShapes(this.params)
          this.params.color = this.getMeshMaterialColor()
        })
        folderGeometry.open()

        this.gui
          .addColor(this.params, 'color')
          .listen()
          .onChange(e => {
            // this.meshMaterial.color.setStyle(e)
            this.setMeshMaterialColor(e)
            this.mesh.children[0].element.style.color = e
          })
        this.gui
          .add(this.params, 'scale', 1, 10)
          .onChange(() => this.setScale())

        const folderCamera = this.gui.addFolder('Camera')
        folderCamera
          .add(this.params, 'animationView')
          .name('Walk mode')
          .onChange(() => {
            this.animateCamera()
          })
        folderCamera
          .add(this.params, 'lookAhead')
          .name('Look ahead')
          .onChange(() => {
            this.animateCamera()
          })
        // folderCamera
        //   .add(this.params, 'cameraHelper')
        //   .onChange(() => this.animateCamera())
        folderCamera.add(this.params, 'speed', {
          Slow: 1,
          Medium: 10,
          Fast: 100
        })
        folderCamera.open()
      }
      //current selction
      this.params.unSelectMesh = () => {
        this.params.previousSelected = this.params.selectedMeshChrom
        this.params.selectedMeshChrom = null
      }
      this.gui.add(this.params, 'unSelectMesh').name('Remove selection')
      // screenshot function
      this.params.screenshot = async () => {
        this.render()
        let screenshotCanvas
        if (this.params.displayLabels) {
          screenshotCanvas = await this.mergeCanvas()
        } else {
          screenshotCanvas = this.renderer.domElement
        }
        screenshotCanvas.toBlob(blob =>
          this.saveBlob(
            blob,
            `g3dv-screencapture-${new Date().toISOString()}.png`
          )
        )
      }
      this.gui.add(this.params, 'screenshot').name('📷Screenshot')
    },
    async mergeCanvas() {
      const labelCanvas = await html2canvas(this.labelRenderer.domElement, {
        backgroundColor: null
      })
      this.render()
      const threeCanvas = this.renderer.domElement
      const newCanvas = document.createElement('canvas')
      const ctx = newCanvas.getContext('2d')
      const width = threeCanvas.width
      const height = threeCanvas.height

      newCanvas.width = width
      newCanvas.height = height
      ;[threeCanvas, labelCanvas].forEach(function(n) {
        ctx.beginPath()
        ctx.drawImage(n, 0, 0, width, height)
      })

      return newCanvas
    },
    setScale() {
      this.mesh.scale.set(
        this.params.scale,
        this.params.scale,
        this.params.scale
      )
    },
    animateCamera() {
      this.cameraHelper.visible = this.params.cameraHelper
      this.cameraEye.visible = this.params.cameraHelper
    },
    update() {
      if (this.params.showAll) {
        Object.keys(this.meshes).forEach(chrom => {
          if (chrom === this.params.selectedMeshChrom) {
            this.setMeshMaterialColor(chrom, 'yellow')
            //this.meshes[chrom].material.color.set(0xffff00)
            this.meshes[chrom].scale.set(1.1, 1.1, 1.1)
            this.meshes[chrom].children[0].element.style.color = '#ffff00'
          }
          if (chrom === this.params.previousSelected) {
            const colorKey = `color_${chrom}`
            const color = this.params[colorKey]
            //this.meshes[chrom].material.color.setStyle(color)
            this.setMeshMaterialColor(chrom, color)
            this.meshes[chrom].scale.set(1, 1, 1)
            this.meshes[chrom].children[0].element.style.color = color
          }
        })
      } else {
        if (this.params.selectedMeshChrom) {
          // this.mesh.material.color.set(0xffff00)
          this.setMeshMaterialColor('yellow')
          this.mesh.scale.set(1.1, 1.1, 1.1)
          this.mesh.children[0].element.style.color = '#ffff00'
        } else {
          if (this.params.previousSelected) {
            const color = this.splines[this.params.region].color
            // this.mesh.material.color.setStyle(color)
            this.setMeshMaterialColor(color)
            this.mesh.scale.set(1, 1, 1)
            this.mesh.children[0].element.style.color = color
          }
        }
      }
    },
    render() {
      this.stats.begin()
      // this.renderer.render(this.scene, this.camera)
      if (!this.meshGeometry) {
        return
      }

      const time = Date.now()
      const looptime = (20 * 100000) / this.params.speed
      const t = (time % looptime) / looptime

      const pos = this.meshGeometry.parameters.path.getPointAt(t)
      pos.multiplyScalar(this.params.scale)
      // interpolation

      const segments = this.meshGeometry.tangents.length
      const pickt = t * segments
      const pick = Math.floor(pickt)
      const pickNext = (pick + 1) % segments

      this.binormal.subVectors(
        this.meshGeometry.binormals[pickNext],
        this.meshGeometry.binormals[pick]
      )
      this.binormal
        .multiplyScalar(pickt - pick)
        .add(this.meshGeometry.binormals[pick])
      const dir = this.meshGeometry.parameters.path.getTangentAt(t)
      const offset = 1
      this.normal.copy(this.binormal).cross(dir)
      // we move on a offset on its binormal
      pos.add(this.normal.clone().multiplyScalar(offset))
      this.splineCamera.position.copy(pos)
      this.cameraEye.position.copy(pos)
      // using arclength for stablization in look ahead
      const lookAt = this.meshGeometry.parameters.path
        .getPointAt(
          (t + 30 / this.meshGeometry.parameters.path.getLength()) % 1
        )
        .multiplyScalar(this.params.scale)
      // camera orientation 2 - up orientation via normal
      if (!this.params.lookAhead) lookAt.copy(pos).add(dir)
      this.splineCamera.matrix.lookAt(
        this.splineCamera.position,
        lookAt,
        this.normal
      )
      this.splineCamera.quaternion.setFromRotationMatrix(
        this.splineCamera.matrix
      )

      // //picker
      // this.pickHelper.pick(this.pickPosition, this.scene.children, this.camera)

      this.cameraHelper.update()
      this.renderer.render(
        this.scene,
        this.params.animationView ? this.splineCamera : this.camera
      )
      this.labelRenderer.render(this.scene, this.camera)
      this.stats.end()
    },
    onWindowResize() {
      // set the aspect ratio to match the new browser window aspect ratio
      this.camera.aspect =
        this.container.clientWidth / this.container.clientHeight

      // update the camera's frustum
      this.camera.updateProjectionMatrix()

      // update the size of the renderer AND the canvas
      this.renderer.setSize(
        this.container.clientWidth,
        this.container.clientHeight
      )
      this.labelRenderer.setSize(
        this.container.clientWidth,
        this.container.clientHeight
      )
    },
    clearLabelDiv() {
      // const labelDiv = document.querySelector('#labelDiv')
      const labelDiv = this.labelRenderer.domElement
      while (labelDiv.firstChild) {
        labelDiv.removeChild(labelDiv.firstChild)
      }
    },
    toggleLabelDisplay() {
      // const labelDiv = document.querySelector('#labelDiv')
      const labelDiv = this.labelRenderer.domElement
      labelDiv.style.display = this.params.displayLabels ? 'block' : 'none'
    },
    toggleAllMode() {
      this.clearLabelDiv()
      this.params.selectedMeshChrom = null
      if (this.params.showAll) {
        this.params.animationView = false
        this.params.lookAhead = false
        this.params.cameraHelper = false
        this.clearSingleMesh()
        this.addAllShapes(this.params)
        this.updateGui()
      } else {
        this.clearAllMeshes()
        this.addShapes(this.params)
        this.updateGui()
      }
    },
    updateHighlight() {
      if (!this.params.highlight) {
        this.params.highlightIndex = null
      }
      if (this.params.showAll) {
        this.addAllShapes(this.params)
      } else {
        this.addShapes(this.params)
      }
    },
    resetHighlightParams() {
      this.params.highlight = false
      this.params.highlightIndex = null
      this.params.regionStart = this.params.highlightStart = this.params.highlightEnd = this.params.regionBoundaries[
        this.params.region
      ].start
      this.params.regionEnd = this.params.regionBoundaries[
        this.params.region
      ].end
    },
    addAllShapes(params) {
      this.clearAllMeshes()
      this.clearLabelDiv()
      if (this.params.highlight) {
        Object.keys(this.splines).forEach(chrom => {
          const { spline } = this.splines[chrom]
          let mesh
          const highlight = chrom === params.region
          switch (params.shape) {
            case 'line':
              mesh = highlight
                ? getHighlightLineMesh(spline, params, chrom)
                : getLineMesh(spline, params, chrom)
              break
            case 'tube':
              mesh = highlight
                ? getHighlightTubeMesh(spline, params, chrom)
                : getTubeMesh(spline, params, chrom)
              break
            case 'ball':
              mesh = highlight
                ? getHighlightBallMesh
                : getBallMesh(spline, params, chrom)
              break
            default:
              break
          }
          if (!highlight) {
            mesh.material.transparent = true
            mesh.material.opacity = 0.25
          }
          this.scene.add(mesh)
          const displayKey = `display_${chrom}`
          mesh.visible = this.params[displayKey]
          // add label
          const labelDiv = document.createElement('div')
          labelDiv.className = 'label'
          labelDiv.textContent = chrom
          labelDiv.style.marginTop = '-1em'
          const colorKey = `color_${chrom}`
          const color = params[colorKey]
          labelDiv.style.color = color
          const label = new CSS2DObject(labelDiv)
          label.position.copy(spline.getPoint(0))
          mesh.add(label)
          this.meshes[chrom] = mesh
          labelDiv.addEventListener(
            'click',
            () => {
              this.params.previousSelected = this.params.selectedMeshChrom
              this.params.selectedMeshChrom = chrom
            },
            false
          )
        })
      } else {
        Object.keys(this.splines).forEach(chrom => {
          const { spline } = this.splines[chrom]
          let mesh
          switch (params.shape) {
            case 'line':
              mesh = getLineMesh(spline, params, chrom)
              break
            case 'tube':
              mesh = getTubeMesh(spline, params, chrom)
              break
            case 'ball':
              mesh = getBallMesh(spline, params, chrom)
              break
            default:
              break
          }
          this.scene.add(mesh)
          const displayKey = `display_${chrom}`
          mesh.visible = this.params[displayKey]
          // add label
          const labelDiv = document.createElement('div')
          labelDiv.className = 'label'
          labelDiv.textContent = chrom
          labelDiv.style.marginTop = '-1em'
          const colorKey = `color_${chrom}`
          const color = params[colorKey]
          labelDiv.style.color = color
          const label = new CSS2DObject(labelDiv)
          label.position.copy(spline.getPoint(0))
          mesh.add(label)
          this.meshes[chrom] = mesh
          labelDiv.addEventListener(
            'click',
            () => {
              this.params.previousSelected = this.params.selectedMeshChrom
              this.params.selectedMeshChrom = chrom
            },
            false
          )
        })
      }
    },
    addShapes(params) {
      this.clearSingleMesh()
      this.clearLabelDiv()
      this.params.selectedMeshChrom = null
      const { region } = params
      const extrudePath = this.splines[region].spline
      this.meshGeometry = new THREE.TubeBufferGeometry(
        extrudePath,
        2000,
        0.2,
        8,
        false
      )
      if (this.params.highlight) {
        const verticesCount = this.meshGeometry.getIndex().count
        const totalBP = this.params.regionEnd - this.params.regionStart

        //The geometry groups need to start on a multiple of 3 to draw the shapes properly
        const highlightStart =
          Math.floor(
            ((this.params.highlightStart - this.params.regionStart) *
              verticesCount) /
              totalBP /
              3
          ) * 3
        const highlightEnd =
          Math.floor(
            ((this.params.highlightEnd - this.params.regionStart) *
              verticesCount) /
              totalBP /
              3
          ) * 3
        if (
          highlightEnd <= highlightStart ||
          (highlightStart <= 0 && highlightEnd <= 0) ||
          (highlightStart >= verticesCount && highlightEnd >= verticesCount)
        ) {
          this.meshGeometry.addGroup(0, Infinity, 0)
          this.meshMaterial = [
            new THREE.MeshBasicMaterial({
              color: this.splines[params.region].color
            })
          ]
          this.params.highlightIndex = null
        } else {
          this.meshGeometry.addGroup(0, highlightStart, 0)
          this.meshGeometry.addGroup(highlightStart, highlightEnd, 1)
          this.meshGeometry.addGroup(highlightEnd, Infinity, 2)
          this.meshMaterial = [
            new THREE.MeshBasicMaterial({
              color: this.splines[params.region].color
            }),
            new THREE.MeshBasicMaterial({
              color: this.params.highlightColor
            }),
            new THREE.MeshBasicMaterial({
              color: this.splines[params.region].color
            })
          ]
          this.params.highlightIndex = 1
        }
      } else {
        this.meshGeometry.addGroup(0, Infinity, 0)
        this.meshMaterial = [
          new THREE.MeshBasicMaterial({
            color: this.splines[params.region].color
          })
        ]
      }
      this.mesh = new THREE.Mesh(this.meshGeometry, this.meshMaterial)
      // add label
      const labelDiv = document.createElement('div')
      labelDiv.className = 'label'
      labelDiv.textContent = region
      labelDiv.style.marginTop = '-1em'
      labelDiv.style.color = this.splines[params.region].color
      const label = new CSS2DObject(labelDiv)
      label.position.copy(extrudePath.getPoint(0))
      this.mesh.add(label)
      this.parent.add(this.mesh)
      labelDiv.addEventListener(
        'click',
        () => {
          this.params.previousSelected = this.params.selectedMeshChrom
          this.params.selectedMeshChrom = params.region
        },
        false
      )
    },
    getHighlightParams(chroms, data) {
      //find the start and end bp for each region
      chroms.forEach(chrom => {
        let key = chrom.split("_")
        this.params.regionBoundaries[chrom] = {
          start: data[key[1]][key[0]].start[0],
          end: data[key[1]][key[0]].start.slice(-1)[0]
        }
      })
      this.resetHighlightParams()
    },
    disposeMesh(mesh) {
      mesh.geometry.dispose()
      if (mesh.material.isMaterial) {
        mesh.material.dispose()
      } else {
        for (const material of mesh.material) {
          material.dispose()
        }
      }
    },
    clearSingleMesh() {
      if (this.mesh) {
        this.parent.remove(this.mesh)
        this.disposeMesh(this.mesh)
      }
    },
    clearAllMeshes() {
      if (Object.keys(this.meshes).length) {
        Object.keys(this.meshes).forEach(chrom => {
          const mesh = this.meshes[chrom]
          this.scene.remove(mesh)
          this.disposeMesh(mesh)
        })
      }
    },
    getMeshMaterialColor() {
      return this.params.highlightIndex === 0
        ? this.meshMaterial[1].color.getStyle()
        : this.meshMaterial[0].color.getStyle()
    },
    setMeshesMaterialColor(chrom, color) {
      if (chrom === this.params.region) {
        for (const [key, material] of Object.entries(
          this.meshes[chrom].material
        )) {
          //key and this.params.highlightIndex are of different types
          if (key != this.params.highlightIndex) {
            material.color.setStyle(color)
          }
        }
      } else {
        this.meshes[chrom].material[0].color.setStyle(color)
      }
    },
    setMeshMaterialColor(color) {
      for (const [key, material] of Object.entries(this.meshMaterial)) {
        //key and this.params.highlightIndex are of different types
        if (key != this.params.highlightIndex) {
          material.color.setStyle(color)
        }
      }
    },
    setHighlightMaterialColor(color) {
      if (this.params.highlightIndex) {
        if (this.params.showAll) {
          this.meshes[this.params.region].material[
            this.params.highlightIndex
          ].color.setStyle(color)
        } else {
          this.meshMaterial[this.params.highlightIndex].color.setStyle(color)
        }
      }
    },
    saveBlob(blob, fileName) {
      const a = document.createElement('a')
      document.body.appendChild(a)
      a.style.display = 'none'
      return (function saveData(blob, fileName) {
        // console.log(blob)
        const url = window.URL.createObjectURL(blob)
        // console.log(url)
        a.href = url
        a.download = fileName
        a.click()
      })(blob, fileName)
    }
    // getCanvasRelativePosition(event) {
    //   const rect = this.container.getBoundingClientRect()
    //   return {
    //     x: event.clientX - rect.left,
    //     y: event.clientY - rect.top
    //   }
    // },
    // setPickPosition(event) {
    //   const pos = this.getCanvasRelativePosition(event)
    //   this.pickPosition.x = (pos.x / this.container.clientWidth) * 2 - 1
    //   this.pickPosition.y = (pos.y / this.container.clientHeight) * -2 + 1 // note we flip Y
    // },
    // clearPickPosition() {
    //   // unlike the mouse which always has a position
    //   // if the user stops touching the screen we want
    //   // to stop picking. For now we just pick a value
    //   // unlikely to pick something
    //   this.pickPosition.x = -100000
    //   this.pickPosition.y = -100000
    // }
  },
  mounted() {
    this.init()
    window.addEventListener('resize', this.onWindowResize)
    // window.addEventListener('mousemove', this.setPickPosition)
    // window.addEventListener('mouseout', this.clearPickPosition)
    // window.addEventListener('mouseleave', this.clearPickPosition)

    // //for mobile
    // window.addEventListener(
    //   'touchstart',
    //   event => {
    //     // prevent the window from scrolling
    //     event.preventDefault()
    //     this.setPickPosition(event.touches[0])
    //   },
    //   { passive: false }
    // )

    // window.addEventListener('touchmove', event => {
    //   this.setPickPosition(event.touches[0])
    // })

    // window.addEventListener('touchend', this.clearPickPosition)
  },
  watch: {
    data3d(newData, oldData) {
      if (newData !== oldData) {
        // renderShape(newData, this.scene, this.drawParam)
        const { region, resolution, regionControl } = this.$store.state.g3d
        const parsed = parseRegionString(region)
        let data
        if (regionControl === 'genome'){
          data = newData
        } else {
          data = {}
          for (const [type, chroms] of Object.entries(newData)){
            data[type] = {}
            for (const [chrom, dat] of Object.entries(chroms)){
              if (chrom === parsed.chr) {
                data[type][chrom] = dat
                if (regionControl === 'region') {
                  const currChr = data[type][chrom]
                  const start = _.sortedIndex(currChr.start, parsed.start)
                  const end = _.sortedLastIndex(currChr.start, parsed.end)
                  for (const [key, value] of Object.entries(currChr)){
                    currChr[key] = value.slice(start, end)
                  }
                  console.log(data[type])
                }
              }
            }
          }
        }
        this.splines = getSplines(data)
        this.clearSingleMesh()
        this.clearAllMeshes()
        // show first model by default
        const chroms = Object.keys(this.splines)

        // checks if the chroms are different from before
        // if chroms are the same, that means new data is from dynamic resolution scaling
        const previousChroms = Object.keys(this.params.previousSplines)
        const currChroms = Object.keys(this.splines)
        console.log(previousChroms, currChroms)
        if (
          previousChroms.includes(...currChroms) &&
          previousChroms.length === currChroms.length
        ) {
          console.log("zooming")
          for (const [chrom, spline] of Object.entries(this.splines)) {
            spline.color = this.params.previousSplines[chrom].color
          }
        } else {
          console.log("not zooming")
          Object.keys(this.splines).forEach(chrom => {
            // set each chrom color
            const colorKey = `color_${chrom}`
            const displayKey = `display_${chrom}`
            this.params[colorKey] = this.splines[chrom].color
            this.params[displayKey] = true
          })
        }
        this.params.previousSplines = this.splines
        this.params.region = chroms[0]

        if (this.params.zooming) {
          this.params.zooming = false
        } else {
          //determines which displayRegion the user selected
          if (regionControl === 'genome') {
            this.params.displayRegion = 'wholeGenome'
            this.getHighlightParams(chroms, data)
          } else if (regionControl === 'region') {
            this.params.displayRegion = 'inputRegion'
            this.params.highlight = false
            this.params.highlightIndex = null
          } else {
            this.params.displayRegion = 'wholeChromosome'
            this.getHighlightParams(chroms, data)
          }
        }
        if (this.params.showAll) {
          this.addAllShapes(this.params)
        } else {
          this.addShapes(this.params)
        }
        this.updateGui()
        this.clearLabelDiv()
      }
    }
    // drawParam: {
    //   handler(newParam) {
    //     console.log(newParam)
    //   },
    //   deep: true
    // }
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.onWindowResize)
    // window.removeEventListener('mousemove', this.setPickPosition)
    // window.removeEventListener('mouseout', this.clearPickPosition)
    // window.removeEventListener('mouseleave', this.clearPickPosition)
  }
}
</script>

<style>
#parentContainer {
  position: relative;
}
#canvasContainer {
  width: 100%;
  height: 100%;
  display: block;
  font-size: 0;
  /* touch-action: none; */
}
#stats {
  position: absolute;
  left: 0px;
  top: 0px;
}
#gui-container {
  position: absolute;
  top: 0px;
  right: 0px;
  z-index: 10;
}

.dg .cr.boolean {
  overflow: visible;
}
.label {
  font-size: 12px;
  color: #fff;
  font-family: sans-serif;
  padding: 2px;
  background: rgba(0, 0, 0, 0.6);
  cursor: pointer;
}

/* #labelDiv {
  pointer-events: none;
} */
</style>
