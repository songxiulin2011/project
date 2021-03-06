import Vue from 'vue'
import Vuex from 'vuex'

import * as actions from './actions'
import * as mutations from './mutations'
import * as getters from './getters'

import system from './system'
import blog from './blog'

Vue.use(Vuex)

/**
 * TODO:
 * 为后续后台扩展做铺垫
 * 目前已有的模块：
 * system
 * blog
 */

 // 开发环境接口跨域
const dev = process.env.NODE_ENV === 'development' ? '/dev' : ''
const host = `${dev}/api_admin`

let state = {
  host,
  userInfo: {
    _id: '',
    username: ''
  }
}

export default new Vuex.Store({
  state,
  actions,
  mutations,
  getters,
  modules: {
    system,
    blog
  }
})
