var express = require("express");
var router = express.Router();
var Article = require("../models/article");
var User = require("../models/user");
var Project = require("../models/project");
 
/**
 * 统一返回格式
 * code: 0 无错误
 */
var responseData;

router.use(function (req, res, next) {
  responseData = {
    code: 0,
    msg: "success",
    data: [],
    total: 0,
    userInfo: {
      _id: (req.cookies.get('userInfo') && JSON.parse(req.cookies.get('userInfo'))._id) || null,
      username: (req.cookies.get('userInfo') && new Buffer(JSON.parse(req.cookies.get('userInfo')).username, 'base64').toString()) || null
    }
  };
  next();
});

/**
 * 判断用户是否登录
 * code: 1 未登录
 */
router.get('/isLogin', function (req, res, next) {
  if (req.cookies.get('userInfo')) {
    responseData.msg = '已登录';
  } else {
    responseData.code = 1;
    responseData.msg = '未登录';
  }
  res.json(responseData);
});

/**
 * 通用权限处理
 * role: 1 游客 无权限
 * role: 2 管理员 返回自己的文章并操作(除置顶之外)
 * role: 3 超级管理员 为所欲为
 * 
 * code: 1   无登录
 * code: 403 无权限
 */
var permission = function  (req, res, next, callback) {
  User.findOne(responseData.userInfo).then(function (userInfo) {
    if (!userInfo) {
      responseData.code = 1;
      responseData.msg = '先登录再上车！';
      res.json(responseData);
      return;
    }

    if (userInfo && userInfo.role === 1) {
      responseData.code = 403;
      responseData.msg = '有没有权限心里没点b数吗？';
      res.json(responseData);
      return;
    }

    callback && callback(userInfo);
  });
}

/**
 * 获取全部文章
 * TODO: 实现标签查询、模糊查询
 */
router.get("/getArticle", function (req, res, next) {
  permission(req, res, next, function(userInfo) {
    var query;

    if (userInfo && userInfo.role === 3) {
      query = { type: req.query.type }
    } else if (userInfo && userInfo.role === 2) {
      query = { type: req.query.type, author: userInfo.username }
    }

    Article.find(query, function(err, data) {
      if (err) throw err;
      responseData.total = data.length;
    });
  
    Article.find(query)
      .skip(Number((req.query.pageCurrent - 1) * req.query.pageSize))
      .limit(Number(req.query.pageSize))
      .sort({
        isTop: -1,
        _id: -1
      })
      .exec(function (err, data) {
        if (err) throw err;
        responseData.data = data;
        res.json(responseData);
      });
  });
});

// 新建文章
router.post("/addArticle", function (req, res, next) {
   permission(req, res, next, function(userInfo) {
    var article = new Article({
      author: userInfo.username,
      title: req.body.title,
      type: req.body.type,
      tags: req.body.tags,
      content: req.body.content
    });

    article.save(function(err) {
      if (err) throw err;
      res.json(responseData);
    });
  });
});

// 更新文章
router.post("/editArticle", function (req, res, next) {
   permission(req, res, next, function(userInfo) {
    var query = { _id: req.body.id };
    var update = {
      $set: {
        author: userInfo.username,
        title: req.body.title,
        type: req.body.type,
        tags: req.body.tags,
        content: req.body.content
      }
    };

    Article.update(query, update, function(err) {
      if (err) throw err;
      res.json(responseData);
    });
  });
});

// 置顶文章、取消置顶
router.post("/topArticle", function (req, res, next) {
   permission(req, res, next, function(userInfo) {
    if (userInfo && userInfo.role === 2) {
      var text = req.body.isTop ? '置顶' : '取消置顶'
      responseData.code = 403;
      responseData.msg = `${text}文章请联系超级管理员！`;
      res.json(responseData);
      return;
    }

    var query = { _id: req.body.id };
    var update = {
      $set: {
        isTop: req.body.isTop
      }
    };

    Article.update(query, update, function(err) {
      if (err) throw err;
      res.json(responseData);
    });
  });
});

// 前台页面隐藏文章、显示文章
router.post("/hideArticle", function (req, res, next) {
   permission(req, res, next, function(userInfo) {
    var query = { _id: req.body.id };
    var update = {
      $set: {
        isShow: req.body.isShow
      }
    };

    Article.update(query, update, function(err) {
      if (err) throw err;
      res.json(responseData);
    });
  });
});

/**
 * 获取用户列表
 * 该列表只有超级管理员才有权限查看
 */
router.get("/getUser", function (req, res, next) {
   permission(req, res, next, function(userInfo) {
    if (userInfo && userInfo.role === 2) {
      responseData.code = 403;
      responseData.msg = '只有超级管理员才有权查看用户列表！';
      res.json(responseData);
      return;
    }
      
    if (userInfo && userInfo.role === 3) {
      User.find({}, function(err, data) {
        if (err) throw err;
        responseData.total = data.length;
      });
    
      User.find({})
        .skip(Number((req.query.pageCurrent - 1) * req.query.pageSize))
        .limit(Number(req.query.pageSize))
        .sort({
          role: -1,
          _id: -1
        })
        .exec(function(err, data) {
          if (err) throw err;
          responseData.data = data;
          res.json(responseData);
        });
    }
  });
});

/** 
 * 用户注册
 * code: 1 重复的用户名
 */
router.post("/register", function (req, res, next) {
   var role;
  // 邀请码
  // TODO: 实现动态邀请码
  User.findOne({
    username: req.body.username
  }).then(function(userInfo) {
    if (userInfo) {
      responseData.code = 1;
      responseData.msg = '该用户名已被注册！';
      res.json(responseData);
      return;
    }

    if (req.body.code === "_admin1122@") {
      role = 3
    } else if (req.body.code === "_admin1028@") {
      role = 2
    } else {
      role = 1
    }
    var user = new User({
      username: req.body.username,
      password: req.body.password,
      role: role
    });
  
    user.save(function(err) {
      if (err) throw err;
      res.json(responseData);
    });
  });
});

/**
 * 用户登录
 * code:1 用户名或密码错误
 */
router.post("/login", function (req, res, next) {
   User.findOne({
    username: req.body.username,
    password: req.body.password
  }).then(function(userInfo) {
    if (!userInfo) {
      responseData.code = 1;
      responseData.msg = '用户名或密码错误';
      res.json(responseData);
      return;
    }
    responseData.msg = '登录成功';
    responseData.userInfo.username = userInfo.username;
    /**
     * NOTE:
     * http的header字符集支持US-ASCII子集的字符集，故设置中文是'utf8'时就会报错
     * new Buffer('xxx').toString('base64')    转base64字符
     * new Buffer('xxx', 'base64').toString()  base64字符还原
     */
    req.cookies.set('userInfo', JSON.stringify({
      _id: userInfo._id,
      username: new Buffer(userInfo.username).toString('base64')
    }));
    res.json(responseData);
    return;
  });
});

// 用户退出
router.post("/logout", function (req, res, next) {
  req.cookies.set('userInfo', null);
  res.json(responseData);
});

// 设置、取消管理员
router.post('/adminUser', function (req, res, next) {
  permission(req, res, next, function(userInfo) {
    if (userInfo && userInfo.role === 2) {
      responseData.code = 403;
      responseData.msg = '有没有权限心里没点b数吗？';
      res.json(responseData);
      return;
    }

    if (userInfo && userInfo.role === 3) {
      var query = { _id: req.body.id };
      var update = {
        $set: {
          role: req.body.role
        }
      };
  
      User.update(query, update, function(err) {
        if (err) throw err;
        res.json(responseData);
      });
    }
  });
});

/**
 * 获取全部项目
 * TODO: 实现模糊查询
 */
router.get("/getProject", function (req, res, next) {
  permission(req, res, next, function(userInfo) {
    var query;

    if (userInfo && userInfo.role === 3) {
      query = { type: req.query.type }
    } else if (userInfo && userInfo.role === 2) {
      query = { type: req.query.type, author: userInfo.username }
    }

    Project.find(query, function(err, data) {
      if (err) throw err;
      responseData.total = data.length;
    });
  
    Project.find(query)
      .skip(Number((req.query.pageCurrent - 1) * req.query.pageSize))
      .limit(Number(req.query.pageSize))
      .sort({
        _id: -1
      })
      .exec(function (err, data) {
        if (err) throw err;
        responseData.data = data;
        res.json(responseData);
      });
  });
});

// 新建项目
router.post("/addProject", function (req, res, next) {
  permission(req, res, next, function(userInfo) {
   var project = new Project({
     author: userInfo.username,
     name: req.body.name,
     about: req.body.about,
     link: req.body.link,
     cover: req.body.cover
   });

   project.save(function(err) {
     if (err) throw err;
     res.json(responseData);
   });
 });
});

// 更新项目
router.post("/updateProject", function (req, res, next) {
  permission(req, res, next, function(userInfo) {
   var query = { _id: req.body.id };
   var update = {
     $set: {
       author: userInfo.username,
       name: req.body.name,
       about: req.body.about,
       link: req.body.link,
       cover: req.body.cover
     }
   };

   Project.update(query, update, function(err) {
     if (err) throw err;
     res.json(responseData);
   });
 });
});

// 删除项目
router.post("/deleteProject", function (req, res, next) {
  permission(req, res, next, function(userInfo) {
   var query = { _id: req.body.id };

   Project.remove(query, function(err) {
     if (err) throw err;
     res.json(responseData);
   });
 });
});

// 前台页面隐藏文章、显示文章
router.post("/hideProject", function (req, res, next) {
  permission(req, res, next, function(userInfo) {
   var query = { _id: req.body.id };
   var update = {
     $set: {
       isShow: req.body.isShow
     }
   };

   Project.update(query, update, function(err) {
     if (err) throw err;
     res.json(responseData);
   });
 });
});

module.exports = router;
