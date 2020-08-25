import Vue from 'vue'
import Vuex from 'vuex'
import { parseRegionString } from './helper'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    resolutions: [
      200000,
      180000,
      160000,
      140000,
      120000,
      100000,
      80000,
      60000,
      40000,
      20000,
      10000
    ],
    g3d: {},
    data3d: [],
    isLoading: false,
    g3dFile: null,
    stateErrorMsg: null,
    region: null
  },
  mutations: {
    SET_G3D(state, g) {
      Vue.set(state, 'g3d', { ...g })
    },
    SET_LOADING_STATUS(state) {
      state.isLoading = !state.isLoading
    },
    SET_DATA3D(state, data) {
      console.log(data)
      Vue.set(state, 'data3d', data)
    },
    SET_G3D_FILE(state, gf) {
      Vue.set(state, 'g3dFile', gf)
    },
    SET_STATE_ERROR_MSG(state, msg) {
      Vue.set(state, 'stateErrorMsg', msg)
    },
    SET_REGIONCONTROL(state, regionControl) {
      Vue.set(state, 'regionControl', regionControl)
    }
  },
  actions: {
    setG3d({ commit }, g) {
      commit('SET_G3D', g)
    },
    setG3dFile({ commit }, gf) {
      commit('SET_G3D_FILE', gf)
    },
    async fetchData({ commit, state }) {
      const { region, resolution, regionControl } = state.g3d
      const parsedRegion = parseRegionString(region)
      if (parsedRegion.error) {
        commit('SET_STATE_ERROR_MSG', parsedRegion.error)
        return
      }
      commit('SET_REGIONCONTROL', regionControl)
      commit('SET_STATE_ERROR_MSG', null)
      commit('SET_LOADING_STATUS')
      const data = await state.g3dFile.readData(resolution)
      // const data = await this.state.g3dFile.readDataGenome(200000)
      // const sorted = data.sort(
      //   (a, b) => a[0].localeCompare(b[0]) || a[1] - b[1]
      // )
      // const pat = sorted.filter(item => item[6] === 'p')
      // const ensured = ensureMaxListLength(pat, 2000)
      commit('SET_DATA3D', data)
      commit('SET_LOADING_STATUS')
    },
    async fetchDataDynamicResolution({ commit, state }, resolution) {
      const { region } = state.g3d
      //console.log(resolution)
      const parsedRegion = parseRegionString(region)
      if (parsedRegion.error) {
        commit('SET_STATE_ERROR_MSG', parsedRegion.error)
        return
      }
      commit('SET_STATE_ERROR_MSG', null)
      commit('SET_LOADING_STATUS')
      const data = await state.g3dFile.readData(resolution)
      commit('SET_DATA3D', data)
      commit('SET_LOADING_STATUS')
    }
  }
})
