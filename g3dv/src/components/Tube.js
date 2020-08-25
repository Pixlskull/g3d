import * as THREE from 'three'
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
// import { MeshLine, MeshLineMaterial } from 'three.meshline'
import _ from 'lodash'
import iwanthue from 'iwanthue'
import { clearScene } from '../helper'
import { Line } from 'three'

/**
 * this component renders a 3D tube given the data3d array data
 * @author Daofeng Li
 */

function reformatData(data) {
  const grouped = _.groupBy(data, x => x[6])
  const sorted = {}
  Object.keys(grouped).forEach(key => {
    const sort = grouped[key].sort(
      (a, b) => a[0].localeCompare(b[0]) || a[1] - b[1]
    )
    sorted[key] = sort
  })
  return sorted
}

export function getSplines(data) {
  // if (!data.length) {
  //   // console.error('error: data for splines is empty')
  //   return
  // }
  const splines = {}
  const palette = iwanthue(Object.keys(data.maternal).length * 2)
  let colorCounter = 0
  for (let [type, chroms] of Object.entries(data)) {
    //console.log(type, chroms)
    for (let [chrom, dat] of Object.entries(chroms)) {
      //console.log(chrom, dat)
      // const points = _.zip(dat.x, dat.y, dat.z)
      // console.log(points)
      const points = []
      //console.log(dat.x.length)
      for (let j in dat.x){
        points[j] = new THREE.Vector3(dat.x[j], dat.y[j], dat.z[j])
      }
      //console.log(points)
      const spline = new THREE.CatmullRomCurve3(points)
      const color = palette[colorCounter]
      colorCounter++
      //console.log(`${chrom}_${type}`)
      splines[`${chrom}_${type}`] = { spline, color }
    }
  }
  return splines
}

export function getBallMesh(spline, param, chrom) {
  const points = spline.getPoints(500)
  const geometry = new THREE.SphereBufferGeometry(0.5, 16, 16)
  const colorKey = `color_${chrom}`
  const color = param[colorKey]
  const material = new THREE.MeshBasicMaterial({ color })
  const geoms = []
  points.forEach(point => {
    const geom = geometry.clone()
    geom.translate(point.x, point.y, point.z)
    geoms.push(geom)
  })
  const mergedGeometry = BufferGeometryUtils.mergeBufferGeometries(geoms)
  const mesh = new THREE.Mesh(mergedGeometry, material)
  return mesh
}

export function getHighlightBallMesh(spline, param, chrom) {
  const points = spline.getPoints(500)
  const geometry = new THREE.SphereBufferGeometry(0.5, 16, 16)
  const colorKey = `color_${chrom}`
  const color = param[colorKey]
  let material;
  const verticesCount = geometry.getIndex().count
  const totalBP = param.regionEnd - param.regionStart
  //The geometry groups need to start on a multiple of 3 to draw the shapes properly
  const highlightStart =
    Math.floor(
      ((param.highlightStart - param.regionStart) *
        verticesCount) /
        totalBP /
        3
    ) * 3
  const highlightEnd =
    Math.floor(
      ((param.highlightEnd - param.regionStart) *
        verticesCount) /
        totalBP /
        3
    ) * 3

  if (
    highlightEnd <= highlightStart ||
    (highlightStart <= 0 && highlightEnd <= 0) ||
    (highlightStart >= verticesCount && highlightEnd >= verticesCount)
  ) {
    geometry.addGroup(0, Infinity, 0)
    material = [
      new THREE.MeshBasicMaterial({
        color
      })
    ]
    param.highlightIndex = null
  } else {
    geometry.addGroup(0, highlightStart, 0)
    geometry.addGroup(highlightStart, highlightEnd, 1)
    geometry.addGroup(highlightEnd, Infinity, 2)
    material = [
      new THREE.MeshBasicMaterial({
        color
      }),
      new THREE.MeshBasicMaterial({
        color: param.highlightColor
      }),
      new THREE.MeshBasicMaterial({
        color
      })
    ]
    param.highlightIndex = 1
  }
  const geoms = []
  points.forEach(point => {
    const geom = geometry.clone()
    geom.translate(point.x, point.y, point.z)
    geoms.push(geom)
  })
  const mergedGeometry = BufferGeometryUtils.mergeBufferGeometries(geoms)
  const mesh = new THREE.Mesh(mergedGeometry, material)
  return mesh
}

export function getTubeMesh(spline, param, chrom) {
  const geometry = new THREE.TubeBufferGeometry(spline, 2000, 0.5, 8, false)
  const colorKey = `color_${chrom}`
  const color = param[colorKey]
  const material = new THREE.MeshBasicMaterial({ color })
  const mesh = new THREE.Mesh(geometry, material)
  return mesh
}

export function getHighlightTubeMesh(spline, param, chrom) {
  const geometry = new THREE.TubeBufferGeometry(spline, 2000, 0.5, 8, false)
  const colorKey = `color_${chrom}`
  const color = param[colorKey]
  let material;
  const verticesCount = geometry.getIndex().count
  const totalBP = param.regionEnd - param.regionStart
  //The geometry groups need to start on a multiple of 3 to draw the shapes properly
  const highlightStart =
    Math.floor(
      ((param.highlightStart - param.regionStart) *
        verticesCount) /
        totalBP /
        3
    ) * 3
  const highlightEnd =
    Math.floor(
      ((param.highlightEnd - param.regionStart) *
        verticesCount) /
        totalBP /
        3
    ) * 3

  if (
    highlightEnd <= highlightStart ||
    (highlightStart <= 0 && highlightEnd <= 0) ||
    (highlightStart >= verticesCount && highlightEnd >= verticesCount)
  ) {
    geometry.addGroup(0, Infinity, 0)
    material = [
      new THREE.MeshBasicMaterial({
        color
      })
    ]
    param.highlightIndex = null
  } else {
    geometry.addGroup(0, highlightStart, 0)
    geometry.addGroup(highlightStart, highlightEnd, 1)
    geometry.addGroup(highlightEnd, Infinity, 2)
    material = [
      new THREE.MeshBasicMaterial({
        color
      }),
      new THREE.MeshBasicMaterial({
        color: param.highlightColor
      }),
      new THREE.MeshBasicMaterial({
        color
      })
    ]
    param.highlightIndex = 1
  }
  const mesh = new THREE.Mesh(geometry, material) // this syntax could definitely be improved!
  return mesh
}
export function getLineMesh(spline, param, chrom) {
  const points = spline.getPoints(5000)
  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  const colorKey = `color_${chrom}`
  const color = param[colorKey]
  const material = new THREE.LineBasicMaterial({
    color
  })
  const mesh = new Line(geometry, material)
  return mesh
}

export function getHighlightLineMesh(spline, param, chrom) {
  const points = spline.getPoints(5000)
  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  const colorKey = `color_${chrom}`
  const color = param[colorKey]
  let material;
  const verticesCount = 5000
  const totalBP = param.regionEnd - param.regionStart
  //The geometry groups need to start on a multiple of 3 to draw the shapes properly
  const highlightStart =
    Math.floor(
      ((param.highlightStart - param.regionStart) *
        verticesCount) /
        totalBP /
        3
    ) * 3
  const highlightEnd =
    Math.floor(
      ((param.highlightEnd - param.regionStart) *
        verticesCount) /
        totalBP /
        3
    ) * 3

  if (
    highlightEnd <= highlightStart ||
    (highlightStart <= 0 && highlightEnd <= 0) ||
    (highlightStart >= verticesCount && highlightEnd >= verticesCount)
  ) {
    geometry.addGroup(0, Infinity, 0)
    material = [
      new THREE.MeshBasicMaterial({
        color
      })
    ]
    param.highlightIndex = null
  } else {
    geometry.addGroup(0, highlightStart, 0)
    geometry.addGroup(highlightStart, highlightEnd, 1)
    geometry.addGroup(highlightEnd, Infinity, 2)
    material = [
      new THREE.MeshBasicMaterial({
        color
      }),
      new THREE.MeshBasicMaterial({
        color: param.highlightColor
      }),
      new THREE.MeshBasicMaterial({
        color
      })
    ]
    param.highlightIndex = 1
  }
  const mesh = new Line(geometry, material)
  return mesh
}

export function renderShape(data, scene, param) {
  // console.log('render tube...', param)
  if (!data.length) {
    // console.error('error: data for tube is empty')
    return
  }
  // clear old objects on the scene
  clearScene(scene)
  // axis
  const axes = new THREE.AxesHelper(20)
  scene.add(axes)

  const palette = iwanthue(data.length * 2)
  data.forEach((dat, datIndex) => {
    const formatted = reformatData(dat.data)

    Object.keys(formatted).forEach((key, keyIndex) => {
      const tubeData = formatted[key]

      const points = tubeData.map(
        item => new THREE.Vector3(item[3], item[4], item[5])
      )
      const spline = new THREE.CatmullRomCurve3(points)

      // const geometry = new THREE.BufferGeometry().setFromPoints(points2)
      // const material = new THREE.LineBasicMaterial({
      //   color: palette[datIndex + keyIndex],
      //   linewidth: 4 // not working
      // })
      // // Create the final object to add to the scene
      // const curveObject = new THREE.Line(geometry, material)
      // scene.add(curveObject)
      // if (param.shapeType === 'line') {
      //   // line
      //   renderLine(spline, scene, param, palette[datIndex + keyIndex])
      // } else {
      //   // tube
      //   renderTube(spline, scene, param, palette[datIndex + keyIndex])
      // }

      switch (param.shapeType) {
        case 'line':
          getLineMesh(spline, scene, param, palette[datIndex + keyIndex])
          break
        case 'tube':
          getTubeMesh(spline, scene, param, palette[datIndex + keyIndex])
          break
        case 'ball':
          getBallMesh(spline, scene, param, palette[datIndex + keyIndex])
          break
        default:
          break
      }
    })
  })
}

// export function renderTubeToScene(data, scene) {
//   console.log('render tube...')
//   if (!data.length) {
//     console.error('error: data for tube is empty')
//     return
//   }
//   const palette = iwanthue(data.length * 2)
//   console.log(palette)
//   data.forEach((dat, datIndex) => {
//     const formatted = reformatData(dat.data)

//     Object.keys(formatted).forEach((key, keyIndex) => {
//       const tubeData = formatted[key]

//       const pointArray = tubeData.map(
//         item => new BABYLON.Vector3(item[3], item[4], item[5])
//       )
//       console.log(pointArray.length)
//       const catmullRom = BABYLON.Curve3.CreateCatmullRomSpline(
//         pointArray,
//         6,
//         false
//       )
//       const path = catmullRom.getPoints()
//       console.log(path.length)
//       const chromosome = BABYLON.TubeBuilder.CreateTube(
//         'chromosome',
//         {
//           path,
//           radius: 0.1,
//           cap: BABYLON.Mesh.CAP_ALL
//         },
//         scene
//       )

//       const material = new BABYLON.StandardMaterial('material', scene)
//       material.diffuseColor = new BABYLON.Color3.FromHexString(
//         palette[datIndex + keyIndex]
//       )
//       chromosome.material = material
//     })
//   })

//   // chromosome.subdivide(pointArray.length)
//   // // console.log(chromosome.subMeshes, chromosome.subdivide(pointArray.length));

//   // const chromosomeSegments = deconstructMesh(chromosome)

//   // /**
//   //  * Color non-duplication relies on knowing colors of all the segments
//   //  * @type {MeshColorPair[]}
//   //  */
//   // const returnSegments = []

//   // chromosomeSegments.forEach((mesh, index) => {
//   //   let color, rand
//   //   rand = Math.random()
//   //   if (rand < 0.25) {
//   //     color = new BABYLON.Color4(1, 1, 1, 0.7)
//   //   } else if (rand >= 0.25 && rand < 0.5) {
//   //     color = new BABYLON.Color4(1, 0, 0, 1)
//   //   } else if (rand >= 0.5 && rand < 0.75) {
//   //     color = new BABYLON.Color4(0, 1, 0, 1)
//   //   } else {
//   //     color = new BABYLON.Color4(1, 1, 0, 1)
//   //   }

//   //   const materialColor = new BABYLON.StandardMaterial('materialcolor', scene)
//   //   materialColor.diffuseColor = color
//   //   materialColor.computeHighLevel = true
//   //   mesh.material = materialColor
//   //   returnSegments.push({
//   //     segment: mesh,
//   //     color: color,
//   //     vector: pointArray[index]
//   //   })
//   // })

//   // chromosome.dispose()

//   // return returnSegments
// }
