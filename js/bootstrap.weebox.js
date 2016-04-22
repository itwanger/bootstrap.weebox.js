/**
 * weebox.js
 * 
 * @author 沉默王二
 */
(function($) {
	var weebox = function(content, options) {
		var self = this;
		this._dragging = false;
		this._content = content;
		this._options = options;
		this.dh = null;
		this.mh = null;
		this.dt = null;
		this.dc = null;
		this.bo = null;
		this.bc = null;
		this.selector = null;
		this.ajaxurl = null;
		this.options = null;
		this.defaults = {
			boxid : null,
			boxclass : null,
			type : 'dialog',
			title : '',
			width : 0,
			height : 0,
			maxheight : 0,
			timeout : 0,
			draggable : true,
			modal : true,
			focus : null,
			position : 'center',
			overlay : 50,
			showTitle : true,
			showButton : true,
			showCancel : true,
			showOk : true,
			okBtnName : '确定',
			cancelBtnName : '取消',
			contentType : 'text',
			contentChange : false,
			clickClose : false,
			zIndex : 999,
			animate : false,
			trigger : null,
			onclose : null,
			onopen : null,
			onok : null
		};
		// 窗口类型
		this.types = new Array("dialog", "error", "warning", "success", "prompt", "info");
		this.titles = {
			"error" : "!! Error !!",
			"warning" : "Warning!",
			"success" : "Success",
			"prompt" : "Please Choose",
			"dialog" : "Dialog",
			"box" : ""
		};

		this.initOptions = function() {
			if (typeof (self._options) == "undefined") {
				self._options = {};
			}
			if (typeof (self._options.type) == "undefined") {
				self._options.type = 'dialog';
			}
			if (!$.inArray(self._options.type, self.types)) {
				self._options.type = self.types[0];
			}
			if (typeof (self._options.boxclass) == "undefined") {
				self._options.boxclass = self._options.type + "box";
			}
			if (typeof (self._options.title) == "undefined") {
				self._options.title = self.titles[self._options.type];
			}
			if (content.substr(0, 1) == "#") {
				self._options.contentType = 'selector';
				self.selector = content;
			}
			self.options = $.extend({}, self.defaults, self._options);

			YUNM.debug(self.options);
		};

		this.initBox = function() {
			// bootstrap式样的弹出框
			var html = '<div class="weedialog">' + '<div class="modal-content">' + '<div class="modal-header dialog-header">'
					+ '	<button type="button" class="close dialog-close" aria-label="Close"><span aria-hidden="true">&times;</span></button>'
					+ '<h4 class="modal-title dialog-title"></h4>' + '</div>' + '<div class="modal-body dialog-content "></div>'
					+ '	<div class="modal-footer dialog-button">' + '	<button type="button" class="btn dialog-ok" rel="green">确定</button>'
					+ '	<button type="button" class="btn btn-primary dialog-cancel" rel="green">取消</button>' + '</div>' + "</div>" + "</div>";

			// 添加到body中
			self.dh = $(html).appendTo('body').hide().css({
				minWidth : '220px',
				position : 'absolute',
				overflow : 'hidden',
				zIndex : self.options.zIndex
			});
			// 标题
			self.dt = self.dh.find('.dialog-title');
			// 内容
			self.dc = self.dh.find('.dialog-content');
			// ok
			self.bo = self.dh.find('.dialog-ok');
			// 取消
			self.bc = self.dh.find('.dialog-cancel');
			// 整个header
			self.dheader = self.dh.find('.dialog-header');
			// footer区域
			self.df = self.dh.find('.dialog-button');

			if (self.options.boxid) {
				self.dh.attr('id', self.options.boxid);
			}
			if (self.options.boxclass) {
				self.dh.addClass(self.options.boxclass);
			}

			// image类型的不限制高度和宽度，自适应窗口大小
			if (self.options.contentType != "image") {
				if (self.options.height > 0) {
					self.dh.css({
						"height" : self.options.height,
					});
				}
				if (self.options.width > 0) {
					self.dc.css('width', self.options.width);
				}
			}

			// 成功时式样
			if (self.options.type == "success") {
				self.dheader.addClass("alert alert-success");
			} else if (self.options.type == "error") {// 错误消息时
				self.dheader.addClass("alert alert-danger");
				self.bo.addClass("btn-danger");
			}

			// 消息提醒
			if (self.options.type == "info") {
				self.dheader.addClass("alert alert-info");
			} else {
				self.bo.addClass("btn-default");
			}

			// 借助gbiframe
			self.dh.bgiframe();
		};

		// 加载模态层
		this.initMask = function() {
			if (self.options.modal) {
				self.mh = $("<div class='dialog-mask'></div>").appendTo('body').hide().css({
					opacity : self.options.overlay / 100,
					filter : 'alpha(opacity=' + self.options.overlay + ')',
					width : self.bwidth(),
					height : self.bheight(),
					zIndex : self.options.zIndex - 1
				});
			}
		};

		// 加载内容
		this.initContent = function(content) {
			// ok button的名字
			self.bo.val(self.options.okBtnName);
			// cancel button的名字
			self.bc.val(self.options.cancelBtnName);

			// 窗口标题
			self.setTitle(self.options.title);

			if (!self.options.showTitle) {
				self.dheader.hide();
			}
			if (!self.options.showButton) {
				self.df.hide();
			}
			if (!self.options.showCancel) {
				self.bc.hide();
			}
			if (!self.options.showOk) {
				self.bo.hide();
			}
			if (self.options.contentType == "selector") {
				self.selector = self._content;
				self._content = $(self.selector).html();
				self.setContent(self._content);
				// if have checkbox do
				var cs = $(self.selector).find(':checkbox');
				self.dc.find(':checkbox').each(function(i) {
					this.checked = cs[i].checked;
				});
				$(self.selector).empty();
				self.onopen();
				self.show();
				self.focus();
			} else if (self.options.contentType == "ajax") {// content为ajax时，能够将view视图加载到弹出窗口中
				self.ajaxurl = self._content;
				// loading
				self.setContent('<div class="well well-large well-transparent lead"> <i class="icon-spinner icon-spin icon-2x pull-left"></i> 内容加载中... </div>');

				self.show();

				$.ajax({
					type : "post",
					cache : false,
					url : self.ajaxurl,
					success : function(data) {
						// 处理view视图数据
						var json = YUNM.jsonEval(data);

						// 出现error时，关闭当前窗口，弹出错误消息
						if (json[YUNM.keys.statusCode] == YUNM.statusCode.error) {
							self.close();
							$.showErr(json[YUNM.keys.message]);
						} else {
							// 正常情况下，显示内容
							self._content = data;
							self.setContent(self._content);

							// 设置打开事件
							self.onopen();
							// 设置焦点
							self.focus();

							// 居中显示
							if (self.options.position == 'center') {
								self.setCenterPosition();
							}
						}

					},
					// 通过弹出的对话框显示错误信息
					error : function(xhr, ajaxOptions, thrownError) {
						self.close();
						YUNM.ajaxError(xhr, ajaxOptions, thrownError);
					}
				});
			} else if (self.options.contentType == "image") {// image类型时，弹出图片
				self.setContent('<img src=' + self._content + ' ></div>');
				self.onopen();
				self.show();
				self.focus();
			} else {
				self.setContent(self._content);
				self.onopen();
				self.show();
				self.focus();
			}
		};

		this.initEvent = function() {
			// 对按钮加载关闭事件
			self.dh.find(".dialog-close, .dialog-cancel, .dialog-ok").unbind('click').click(function() {
				self.close();
			});
			if (typeof (self.options.onok) == "function") {
				self.bo.unbind('click').click(self.options.onok);
			}
			if (typeof (self.options.oncancel) == "function") {
				self.bc.unbind('click').click(self.options.oncancel);
			}
			// timeout后自动关闭
			if (self.options.timeout > 0) {
				window.setTimeout(self.close, (self.options.timeout) * 1000);
			}
			this.draggable();
		};

		this.draggable = function() {
			if (self.options.draggable && self.options.showTitle) {
				self.dh.find('.dialog-header').mousedown(function(event) {
					self._ox = self.dh.position().left;
					self._oy = self.dh.position().top;
					self._mx = event.clientX;
					self._my = event.clientY;
					self._dragging = true;
				});
				$(document).mousemove(function(event) {
					if (self._dragging == true) {
						self.dh.css({
							left : self._ox + event.clientX - self._mx,
							top : self._oy + event.clientY - self._my
						});
					}
				}).mouseup(function() {
					self._mx = null;
					self._my = null;
					self._dragging = false;
				});
				var e = self.dh.find('.dialog-header').get(0);
				e.unselectable = "on";
				e.onselectstart = function() {
					return false;
				};
				if (e.style) {
					e.style.MozUserSelect = "none";
				}
			}
		};

		this.onopen = function() {
			if (typeof (self.options.onopen) == "function") {
				self.options.onopen();
			}
		};

		// 展示弹出框
		this.show = function() {
			// 动画效果
			if (self.options.animate) {
				self.dh.fadeIn("fast");
				if (self.mh) {
					self.mh.fadeIn("normal");
				}
			} else {
				self.dh.show();
				if (self.mh) {
					self.mh.show();
				}
			}

			if (self.options.position == 'center') {
				self.setCenterPosition();
			}
			if (self.options.position == 'element') {
				self.setElementPosition();
			}
		};

		this.focus = function() {
			if (self.options.focus) {
				self.dh.find("#" + self.options.focus).focus();
			} else {
				self.bo.focus();
			}
		};

		this.find = function(selector) {
			return self.dh.find(selector);
		};

		this.setTitle = function(title) {
			self.dt.html(title);
		};

		this.getTitle = function() {
			return self.dt.html();
		};

		this.setContent = function(content) {
			self.dc.html(content).initUI();
		};

		this.getContent = function() {
			return self.dc.html();
		};

		this.hideButton = function(btname) {
			self.dh.find('.dialog-' + btname).hide();
		};

		this.showButton = function(btname) {
			self.dh.find('.dialog-' + btname).show();
		};

		this.setButtonTitle = function(btname, title) {
			self.dh.find('.dialog-' + btname).val(title);
		};

		// 关闭事件
		this.close = function() {
			if (self.animate) {
				self.dh.fadeOut("fast", function() {
					self.dh.hide();
				});
				if (self.mh) {
					self.mh.fadeOut("normal", function() {
						self.mh.hide();
					});
				}
			} else {
				self.dh.hide();
				if (self.mh) {
					self.mh.hide();
				}
			}
			if (self.options.contentType == 'selector') {
				if (self.options.contentChange) {
					// if have checkbox do
					var cs = self.find(':checkbox');
					$(self.selector).html(self.getContent());
					if (cs.length > 0) {
						$(self.selector).find(':checkbox').each(function(i) {
							this.checked = cs[i].checked;
						});
					}
				} else {
					$(self.selector).html(self._content);
				}
			}
			if (typeof (self.options.onclose) == "function") {
				self.options.onclose();
			}
			// 当前窗口内容移出
			self.dh.remove();

			// 模态层移出
			if (self.mh) {
				self.mh.remove();
			}
		};

		this.bheight = function() {
			if ($.support.msie && $.support.version < 7) {
				var scrollHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
				var offsetHeight = Math.max(document.documentElement.offsetHeight, document.body.offsetHeight);

				if (scrollHeight < offsetHeight) {
					return $(window).height();
				} else {
					return scrollHeight;
				}
			} else {
				return $(document).height();
			}
		};

		this.bwidth = function() {
			if ($.support.msie && $.support.version < 7) {
				var scrollWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
				var offsetWidth = Math.max(document.documentElement.offsetWidth, document.body.offsetWidth);

				if (scrollWidth < offsetWidth) {
					return $(window).width();
				} else {
					return scrollWidth;
				}
			} else {
				return $(document).width();
			}
		};

		// 居中
		this.setCenterPosition = function() {
			var wnd = $(window), doc = $(document);

			// 大小不能超过窗口大小
			var iContentW = wnd.width() - 40;
			var iContentH = self.options.maxheight || wnd.height() - 100 * 2 - 40;
			self.dc.css({
				"max-height" : iContentH + 'px',
				"max-width" : iContentW + 'px',
			});
			self.dheader.css({
				"max-width" : iContentW + 'px',
			});
			self.df.css({
				"max-width" : iContentW + 'px',
			});

			self.dh.css({
				top : (wnd.height() - self.dh.height()) / 2 + doc.scrollTop(),
				left : (wnd.width() - self.dh.width()) / 2 + doc.scrollLeft()
			});

		};

		this.setElementPosition = function() {
			var trigger = $(self.options.trigger);
			if (trigger.length == 0) {
				alert('请设置位置的相对元素');
				self.close();
				return false;
			}
			var left = trigger.offset().left;
			var top = trigger.offset().top + 25;
			self.dh.css({
				top : top,
				left : left
			});
			return true;
		};

		// 窗口初始化
		this.initialize = function() {
			self.initOptions();
			self.initMask();
			self.initBox();
			self.initContent();
			self.initEvent();
			return self;
		};
		// 初始化
		this.initialize();
	};

	// 页面加载时初始化
	var weeboxs = function() {
		var self = this;
		this._onbox = false;
		this._opening = false;
		this.boxs = new Array();
		this.zIndex = 999;
		this.push = function(box) {
			this.boxs.push(box);
		};
		this.pop = function() {
			if (this.boxs.length > 0) {
				return this.boxs.pop();
			} else {
				return false;
			}
		};
		// 提供给外部的open方法
		this.open = function(content, options) {
			self._opening = true;
			if (typeof (options) == "undefined") {
				options = {};
			}
			if (options.boxid) {
				this.close(options.boxid);
			}
			options.zIndex = this.zIndex;
			this.zIndex += 10;
			var box = new weebox(content, options);
			box.dh.click(function() {
				self._onbox = true;
			});
			this.push(box);
			return box;
		};
		// 提供给外部的close方法
		this.close = function(id) {
			if (id) {
				for (var i = 0; i < this.boxs.length; i++) {
					if (this.boxs[i].dh.attr('id') == id) {
						this.boxs[i].close();
						this.boxs.splice(i, 1);
					}
				}
			} else {
				this.pop().close();
			}
		};
		this.length = function() {
			return this.boxs.length;
		};
		this.getTopBox = function() {
			return this.boxs[this.boxs.length - 1];
		};
		this.find = function(selector) {
			return this.getTopBox().dh.find(selector);
		};
		this.setTitle = function(title) {
			this.getTopBox().setTitle(title);
		};
		this.getTitle = function() {
			return this.getTopBox().getTitle();
		};
		this.setContent = function(content) {
			this.getTopBox().setContent(content);
		};
		this.getContent = function() {
			return this.getTopBox().getContent();
		};
		this.hideButton = function(btname) {
			this.getTopBox().hideButton(btname);
		};
		this.showButton = function(btname) {
			this.getTopBox().showButton(btname);
		};
		this.setButtonTitle = function(btname, title) {
			this.getTopBox().setButtonTitle(btname, title);
		};

		$(window).scroll(function() {
			if (self.length() > 0) {
				var box = self.getTopBox();
				if (box.options.position == "center") {
					box.setCenterPosition();
				}
			}
		}).bind("resize", function() {
			// 窗口在resize能够使窗口重新居中，模态层的高度和宽度为当前document的大小
			if (self.length() > 0) {
				// 居中
				var box = self.getTopBox();
				if (box.options.position == "center") {
					box.setCenterPosition();
				}

				if (box.mh) {
					// 模态层先隐藏，使document的高度和宽度得到变化
					box.mh.hide();
					// 设置模态层新的大小
					box.mh.css({
						width : box.bwidth(),
						height : box.bheight(),
					});
					// 展示模态层
					box.mh.show();
				}
			}
		});

		$(document).click(function() {
			if (self.length() > 0) {
				var box = self.getTopBox();
				if (!self._opening && !self._onbox && box.options.clickClose) {
					box.close();
				}
			}
			self._opening = false;
			self._onbox = false;
		});
	};
	$.extend({
		weeboxs : new weeboxs()
	});
})(jQuery);
