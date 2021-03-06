<template>
  <section class="page page-blog-project">
    <Alert class="mod-alert" show-icon closable>
      温馨提示：如果个人项目有自己的服务器请填写链接，如果没有可以联系超管帮忙上传到服务器并给到你链接，仅限于静态页面。
    </Alert>
    <header class="mod-header">
      <h2>项目管理</h2>
      <Button type="primary" @click="handleAddProject" :disabled="permission">新建项目</Button>
    </header>
    <Table border :row-class-name="rowClassName" :columns="projectColumns" :loading="loading" :data="projectData"></Table>
    <Page :total="page.total" :current="page.current" :page-size="page.size" class-name="mod-pagination" show-total @on-change="handleChangePage"></Page>
    <Modal
      v-model="projectModal"
      width="30"
      :title="`${typeZh[projectForm.type]}项目`">
      <Form :model="projectForm" ref="projectForm" label-position="top" :rules="rules">
        <FormItem label="项目名称（限15个字之内）" prop="name">
          <Input v-model="projectForm.name" placeholder="请输入项目名称"></Input>
        </FormItem>
        <FormItem label="项目简介（限100个字之内）" prop="about">
          <Input v-model="projectForm.about" type="textarea" :rows="4" placeholder="请输入项目简介"></Input>
        </FormItem>
        <FormItem label="项目链接" prop="link">
          <Input v-model="projectForm.link" placeholder="请输入项目链接">
            <span slot="prepend">(http|https:)//</span>
          </Input>
        </FormItem>
        <FormItem label="封面图">
          <!-- <Upload
            action="//jsonplaceholder.typicode.com/posts/">
            <div style="padding: 20px 0">
              <Icon type="ios-cloud-upload" size="52"></Icon>
              <p>点击上传项目封面图</p>
            </div>
          </Upload> -->
        </FormItem>
      </Form>
      <div slot="footer">
        <Button type="primary" size="large" long :loading="submitloading" @click="handleSubmit('projectForm')">提交</Button>
      </div>
    </Modal>
  </section>
</template>

<script>
import axios from 'axios'
import { datetime } from '../../lib/format-time'
export default {
  data () {
    return {
      permission: true,
      projectModal: false,
      projectForm: {
        id: '',
        type: '',
        name: '',
        about: '',
        link: '',
        cover: ''
      },
      typeZh: {
        add: '新建',
        update: '更新',
        delete: '删除'
      },
      page: {
        current: 1,
        size: 10,
        total: 0
      },
      loading: false,
      submitloading: false,
      projectData: [],
      projectColumns: [
        {
          type: 'index',
          width: 60,
          align: 'center'
        },
        {
          title: '名称',
          key: 'name'
        },
        {
          title: '作者',
          key: 'author'
        },
        {
          title: '简介',
          key: 'about'
        },
        {
          title: '链接',
          key: 'link',
          render: (h, params) => {
            return h(
              'a',
              {
                attrs: {
                  target: '_blank',
                  href: `//${params.row.link}`
                }
              },
              params.row.link
            )
          }
        },
        {
          title: '封面',
          key: 'cover'
        },
        {
          title: '时间',
          key: 'time',
          render: (h, params) => {
            return h('span', this.formattime(new Date(params.row.time)))
          }
        },
        {
          title: '操作',
          key: 'action',
          width: 240,
          align: 'center',
          render: (h, params) => {
            return h('div', [
              h(
                'Button',
                {
                  props: {
                    type: 'primary',
                    size: 'small'
                  },
                  style: {
                    marginRight: '10px'
                  },
                  on: {
                    click: () => {
                      this.handleEditArcticle(params.index)
                    }
                  }
                },
                '编辑'
              ),
              h(
                'Button',
                {
                  props: {
                    type: 'warning',
                    size: 'small'
                  },
                  style: {
                    marginRight: '10px'
                  },
                  on: {
                    click: () => {
                      this.handleHideArcticle(params.index)
                    }
                  }
                },
                this.hideText(params.index)
              ),
              h('Poptip', {
                props: {
                  confirm: true,
                  width: '200',
                  title: '你确定要删除这个项目吗？'
                },
                on: {
                  'on-ok': () => {
                    this.handleSubmit()
                  }
                }
              }, [
                h('Button',
                  {
                    props: {
                      type: 'error',
                      size: 'small'
                    },
                    on: {
                      click: () => {
                        this.handleDeleteProject(params.index)
                      }
                    }
                  },
                  '删除'
                )
              ])
            ])
          }
        }
      ],
      rules: {
        name: [{ required: true, min: 1, max: 15, message: '项目名称限1-15个字', trigger: 'blur' }],
        about: [{ required: true, min: 1, max: 50, message: '项目简介限1-50个字', trigger: 'blur' }],
        link: [{ required: true, message: '请输入项目链接', trigger: 'blur' }]
      }
    }
  },
  mounted () {
    this.getData(this.page.current)
  },
  methods: {
    // 隐藏项目行样式
    rowClassName (row, index) {
      if (!this.projectData[index].isShow) {
        return 'table-hide-row'
      } else {
        return ''
      }
    },
    // 隐藏按钮文案
    hideText (index) {
      return this.projectData[index].isShow ? '隐藏' : '取消隐藏'
    },
    // 时间格式化
    formattime (time) {
      return datetime(time / 1000)
    },
    // 隐藏项目
    handleHideArcticle (index) {
      let _this = this
      let text
      axios.post(`${_this.$golbal.host}/hideProject`, {
        id: _this.projectData[index]._id,
        isShow: !_this.projectData[index].isShow
      }).then(function (res) {
        if (res.data.code === 0) {
          text = _this.projectData[index].isShow ? '隐藏' : '取消隐藏'
          _this.$Message.success(`${text}成功！该操作只会影响前台页面的展示而已。`)
          _this.getData(1)
        } else {
          _this.$Message.error(`${text}失败！`)
        }
      }).catch(function () {
        _this.$Message.error('接口异常！')
      })
    },
    // 删除项目
    handleDeleteProject (index) {
      this.projectForm = {
        id: this.projectData[index]._id,
        type: 'delete',
        name: '',
        about: '',
        link: '',
        cover: ''
      }
    },
    // 新建项目
    handleAddProject () {
      this.projectModal = true
      this.projectForm = {
        id: '',
        type: 'add',
        name: '',
        about: '',
        link: '',
        cover: ''
      }
    },
    // 编辑项目
    handleEditArcticle (index) {
      this.projectModal = true
      this.projectForm = {
        id: this.projectData[index]._id,
        type: 'update',
        name: this.projectData[index].name,
        about: this.projectData[index].about,
        link: this.projectData[index].link,
        cover: this.projectData[index].cover
      }
    },
    // 获取项目列表
    getData (current) {
      this.loading = true
      let _this = this
      axios.get(`${_this.$golbal.host}/getProject`, {
        params: {
          pageCurrent: current,
          pageSize: _this.page.size
        }
      }).then(function (res) {
        _this.loading = false
        if (res.data.code === 0) {
          _this.permission = false
          _this.projectData = res.data.data
          _this.page.total = res.data.total
        } else {
          _this.$Message.error(res.data.msg)
        }
      }).catch(function () {
        _this.$Message.error('接口异常！')
      })
    },
    // 翻页
    handleChangePage (page) {
      this.page.current = page
      this.getData(page)
    },
    // 提交项目
    handleSubmit (name) {
      let _this = this
      // 新增、更新
      if (name) {
        _this.$refs[name].validate((valid) => {
          if (valid) {
            _this.submitloading = true
            _this.axiosSubmit()
          }
        })
        // 删除
      } else {
        _this.axiosSubmit()
      }
    },
    // 提交请求
    axiosSubmit () {
      var _this = this
      axios.post(`${_this.$golbal.host}/${_this.projectForm.type}Project`, {
        id: _this.projectForm.id,
        name: _this.projectForm.name,
        about: _this.projectForm.about,
        link: _this.projectForm.link,
        cover: _this.projectForm.cover
      }).then(function (res) {
        _this.submitloading = false
        _this.projectModal = false
        if (res.data.code === 0) {
          _this.$Message.success(`${_this.typeZh[_this.projectForm.type]}成功！`)
          _this.getData(1)
        } else {
          _this.$Message.error(res.data.msg)
        }
      }).catch(function () {
        _this.$Message.error('接口异常！')
      })
    }
  }
}
</script>
