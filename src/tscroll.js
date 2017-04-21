/**
 * tScroll
 * @Author  Travis(LinYongji)
 * @Contact http://travisup.com/
 * @Version 2.0.7
 * @date    2014-09-03
 */
(function() {

    var rQuickExpr = /^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/,
        rWhitespace = /(^\s+)|(\s+$)/g;

    var doc = document,
        body,
        touchEvents;

    // 基础兼容封装
    // 获取特定元素
    function getMatchElem(selector, parent, nodes) {
        var rets = [],
            i = 0,
            m,
            match;

        if (selector.nodeType === 1) {
            return selector;
        }
        match = rQuickExpr.exec(selector);
        if (match) {
            if ((m = match[1])) {
                return doc.getElementById(m);
            } else {
                // 获取父节点
                parent = parent || doc;
                if ((m = match[2])) {
                    rets = parent.getElementsByTagName(m);
                } else if ((m = match[3])) {
                    // class 支持nodes，被过滤节点
                    if (!nodes && parent.getElementsByClassName) {
                        rets = parent.getElementsByClassName(m);
                    } else {
                        nodes = nodes || parent.getElementsByTagName('*');
                        for (; i < nodes.length; i++) {
                            if (nodes[i].nodeType === 1 && hasClass(nodes[i], m)) {
                                rets.push(nodes[i]);
                                break;
                            }
                        }
                    }
                }
            }
        }
        return rets[0] || null;
    }
    // 样式操作
    function hasClass(elem, className) {
        return (' ' + elem.className + ' ').indexOf(' ' + className + ' ') >= 0;
    }

    function addClass(elem, className) {
        if (!hasClass(elem, className)) {
            elem.className = trim(elem.className + ' ' + className + ' ');
        }
    }

    function removeClass(elem, className) {
        elem.className = trim((' ' + elem.className + ' ').replace(' ' + className + ' ', ' '));
    }

    function setPixelCss(elem, name, val) {
        elem.style[name] = val + 'px';
    }
    // 删除左右空格
    function trim(str) {
        return (str || '').replace(rWhitespace, '');
    }
    // 事件绑定/解绑
    function addEvent(elem, type, fn) {
        if (window.addEventListener) {
            elem.addEventListener(type, fn, false);
        } else if (doc.attachEvent) {
            elem.attachEvent('on' + type, fn);
        } else {
            elem['on' + type] = fn;
        }
    }

    function removeEvent(elem, type, fn) {
        if (elem.removeEventListener) {
            elem.removeEventListener(type, fn, false);
        } else if (doc.detachEvent) {
            elem.detachEvent('on' + type, fn);
        } else {
            elem['on' + type] = null;
        }
    }
    // 修复ie低版本事件
    function fixEvent(event) {
        if (typeof event.pageX === 'undefined') {
            event.pageX = event.clientX + (event && event.scrollLeft || doc.body.scrollLeft || 0);
            event.pageY = event.clientY + (event && event.scrollTop || doc.body.scrollTop || 0);
        }
        event.preventDefault = event.preventDefault || function() {
            window.event.returnValue = false;
        };
        event.stopPropagation = event.stopPropagation || function() {
            window.event.cancelBubble = true;
        };
        return event;
    }
    // 获取随机数
    function getRand() {
        return (+new Date()) + Math.random().toString().substr(2, 4);
    }
    // 返回false函数
    function returnFalse() {
        return false;
    }
    // 批量插入子节点
    function append(parent, childNodes) {
        while (childNodes[0]) {
            parent.appendChild(childNodes[0]);
        }
    }

    // 滚动条架构
    var frame = [
        '<div class="tscroll-view">',
        '<div class="tscroll-pane">',
        '{{content}}', // 内容
        '</div>',
        '</div>',
        '<div class="tscroll-bar tscroll-hide">',
        '<div class="tscroll-track">',
        '<div class="tscroll-thumb">',
        '<div class="tscroll-thumb-end">',
        '</div>',
        '</div>',
        '</div>',
        '</div>'
    ];

    // 主模块
    function Scrollbar(eWrap, custom) {
        var self = this,
            oView = {
                elem: getMatchElem('.tscroll-view', null, eWrap.childNodes)
            },
            oPane = {
                elem: getMatchElem('.tscroll-pane', null, oView.elem.childNodes)
            },
            oBar = {
                elem: getMatchElem('.tscroll-bar', null, eWrap.childNodes)
            },
            oTrack = {
                elem: getMatchElem('.tscroll-track', oBar.elem)
            },
            oThumb = {
                elem: getMatchElem('.tscroll-thumb', oBar.elem)
            },
            iScroll = 0,
            iPosition = {
                start: 0,
                now: 0
            },
            iMouse = {
                start: 0,
                now: 0
            },
            sAxis = false,
            sDirection = 'top',
            sSize = 'Height',

            // 计数器
            timer = null,
            // 偏移值
            deviant = 0,

            options = {
                scroll: true, // 是否绑定滚动事件
                wheel: 40, // 滚动事件速度
                axis: 'y', // 滚动方向
                trackSize: 'auto', // 滚动条长度
                thumbSize: 'auto', // 滑块长度
                thumbMinSize: 10, // 滑块最小长度
                lockScroll: true, // 锁定滚动事件不被外层接收
                invertScroll: false, // 移动设备反转滚动
                onSelect: true, // ie低版本的鼠标按下选择问题
                bounce: false, // 位置反弹
                callback: returnFalse, // 滚动回调函数
                ready: returnFalse // 初始化完的调用函数
            };

        // 事件绑定
        function bindEvents() {
            // 拖动事件绑定
            if (!touchEvents) {
                addEvent(oThumb.elem, 'mousedown', start);
                //addEvent(oTrack.elem, 'mouseup', drag);
            } else {
                // 触屏事件
                oView.elem.ontouchstart = function(event) {
                    if (event.touches.length === 1) {
                        start(event.touches[0]);
                        event.stopPropagation();
                    }
                };
            }

            // 滚动事件绑定
            if (options.scroll) {
                if (window.addEventListener) {
                    eWrap.addEventListener('mousewheel', wheel, false);
                    // firefox事件独立开来
                    eWrap.addEventListener('DOMMouseScroll', wheel, false);
                    eWrap.addEventListener('MozMousePixelScroll', function(event) {
                        event.preventDefault();
                    }, false);
                } else {
                    // 低版本ie浏览器
                    eWrap.onmousewheel = wheel;
                }
            }
        }

        // 滚动事件
        function wheel(event) {
            if (oPane.ratio < 1) {
                var event = fixEvent(event || window.event),
                    delta = event.wheelDelta ? event.wheelDelta / 120 : -(event.detail || 0) / 3,
                    iScrollTemp = iScroll;

                iScroll -= delta * options.wheel;
                self.moveTo(iScroll, 'wheel');

                if (options.lockScroll || (iScroll !== oPane.slideSize && iScroll !== 0) || iScroll !== iScrollTemp) {
                    event.preventDefault();
                    event.stopPropagation();
                }
            }
        }

        function start(event) {
            // 禁止选择
            addClass(body, 'tscroll-unselect');
            options.onSelect && (body.onselectstart = returnFalse);

            var event = fixEvent(event || window.event),
                thumbPos = parseInt(oThumb.elem.style[sDirection]);
            iMouse.start = sAxis ? event.pageX : event.pageY;
            iPosition.start = isNaN(thumbPos) ? 0 : thumbPos;

            if (!touchEvents) {
                addEvent(doc, 'mousemove', drag);
                addEvent(doc, 'mouseup', end);
                addEvent(oThumb.elem, 'mouseup', end);
            } else {
                // 触屏事件
                doc.ontouchmove = function(event) {
                    event.preventDefault();
                    drag(event.touches[0]);
                };
                doc.ontouchend = end;
            }
        }

        function drag(event) {
            if (oPane.ratio < 1) {
                var event = fixEvent(event || window.event);
                iMouse.now = sAxis ? event.pageX : event.pageY;

                if (options.invertscroll && touchEvents) {
                    // 触屏反转事件
                    iPosition.now = Math.min((oTrack.slideSize), Math.max(0, (iPosition.start + (iMouse.start - iMouse.now))));
                } else {
                    iPosition.now = Math.min((oTrack.slideSize), Math.max(0, (iPosition.start + (iMouse.now - iMouse.start))));
                }
                iScroll = iPosition.now / oTrack.ratio;
                // setPixelCss(oThumb.elem, sDirection, iPosition.now);
                // setPixelCss(oPane.elem, sDirection, -iScroll);
                self.moveTo(iScroll);
            }
            // 解决由于ie拖出窗口丢失mouseup的问题
            var ua = window.navigator.userAgent.toLowerCase();
            if (/msie/.test(ua) && !(document.documentMode >= 9) && !event.button) {
                end.call(this, event);
            }
        }

        function end() {
            removeClass(body, 'tscroll-unselect');
            options.onSelect && (body.onselectstart = null);

            if (!touchEvents) {
                removeEvent(doc, 'mousemove', drag);
                removeEvent(doc, 'mouseup', end);
                removeEvent(oThumb.elem, 'mouseup', end);
            } else {
                doc.ontouchmove = doc.ontouchend = null;
            }
        }

        // 回弹效果
        function rebound(origScroll) {
            var speed = (origScroll == 0 ? options.wheel : -options.wheel) / 1.2; //设置回弹速度

            iScroll += speed;
            if (iScroll >= 0 && iScroll <= oPane.slideSize) {
                iScroll = origScroll;
            }
            self.moveTo(iScroll);
        }

        function initialize() {
            self.setting(custom);
            bindEvents();
            options.ready(self);
            self.update();
        }

        this.scroll = iScroll; // 滚动位移
        this.direction = sDirection; // 滚动的方向
        this.wheel = wheel; // 滚动的速度

        this.setting = function(custom) {
            var i;
            if (typeof custom === 'object') {
                for (i in options) {
                    if (typeof custom[i] !== 'undefined') {
                        options[i] = custom[i];
                    }
                }
                sAxis = options.axis === 'x';
                sSize = sAxis ? 'Width' : 'Height';
                sDirection = sAxis ? 'left' : 'top';
                // 暴露数据
                self.direction = sDirection;
                self.wheel = options.wheel;
            }
            return self;
        };

        this.update = function(scroll) {
            var sCssSize = sSize.toLowerCase(),
                thumbScrollSize = oThumb.elem.style[sDirection];

            if (isNaN(parseFloat(thumbScrollSize))) {
                thumbScrollSize = 0;
            } else {
                thumbScrollSize = parseFloat(thumbScrollSize);
            }

            oView.size = oView.elem['offset' + sSize];
            oPane.size = oPane.elem['scroll' + sSize];
            oPane.slideSize = Math.max(oPane.size - oView.size, 0);
            oPane.ratio = oPane.size == 0 ? 1 : parseFloat(oView.size) / oPane.size;

            if (oPane.ratio >= 1) {
                addClass(oBar.elem, 'tscroll-hide');
            } else {
                removeClass(oBar.elem, 'tscroll-hide');
            }
            oTrack.size = options.trackSize === 'auto' ? oView.size : options.trackSize;
            oThumb.size = options.thumbSize === 'auto' ? Math.max(oTrack.size * oPane.ratio, options.thumbMinSize) : options.thumbSize;
            oTrack.slideSize = oTrack.size - oThumb.size;
            oTrack.ratio = oPane.slideSize == 0 ? 1 : parseFloat(oTrack.slideSize) / oPane.slideSize;

            setPixelCss(oBar.elem, sCssSize, oTrack.size);
            setPixelCss(oTrack.elem, sCssSize, oTrack.size);
            setPixelCss(oThumb.elem, sCssSize, Math.round(oThumb.size));
            if (typeof scroll !== 'undefined') {
                iScroll = scroll === 'bottom' ? oPane.slideSize : parseInt(scroll);
            }

            self.trackSize = oTrack.size;
            self.thumbSize = oThumb.size;

            self.moveTo(iScroll);
            // 计算滚动条差值，修正滑动距离
            iPosition.start += parseFloat(oThumb.elem.style[sDirection]) - thumbScrollSize;
            return self;
        };

        this.moveTo = function(scroll, eventName) {
            var iScrollTemp, origScroll;
            // 修正位置
            iScroll = Math.min((oPane.slideSize), Math.max(0, scroll));
            iScrollTemp = iScroll;

            // 回弹效果
            if (options.bounce && (scroll < 0 || scroll > oPane.slideSize)) {
                origScroll = iScroll;

                clearTimeout(timer);
                iScroll = scroll;
                timer = setTimeout(function() {
                    rebound(origScroll);
                }, 13);
            }

            // 设置样式
            setPixelCss(oThumb.elem, sDirection, Math.round(iScrollTemp * oTrack.ratio));
            setPixelCss(oPane.elem, sDirection, -iScroll);
            
            self.scroll = iScroll;
            self.scrollProgress = iScroll / oPane.slideSize;
            self.scrollSize = oPane.slideSize;
            self.eventName = eventName || '';
            options.callback(self);
            return self;
        };

        initialize();
        return this;
    }

    // 入口函数
    function tScroll(selector, options) {
        var self = tScroll,
            elem = getMatchElem(selector),
            rand = getRand();

        // 如果body不存在，初始化body
        body == null && (body = getMatchElem("body"));
        // 判断是否支持触摸事件
        touchEvents == null && (touchEvents = typeof doc.documentElement.ontouchstart !== "undefined");

        // 元素存在，才初始化
        if (elem != null) {
            // 如果已经被初始化，返回原有对象
            var old = elem.getAttribute("data-tscroll");
            if (old && self.list[old]) {
                return self.list[old].update(0);
            }

            addClass(elem, "tscroll");
            elem.setAttribute("data-tscroll", rand);

            // innerHTML会导致原有事件丢失
            // elem.innerHTML = frame.join("").replace("{{content}}", elem.innerHTML);
            // 生成滚动条框架
            var drag = doc.createDocumentFragment(),
                temp = doc.createElement("div");

            temp.innerHTML = frame.join("").replace("{{content}}", "");
            append(drag, temp.childNodes);
            append(drag.firstChild.firstChild, elem.childNodes);
            elem.appendChild(drag);
            // 防止泄漏
            temp = drag = null;

            return self.list[rand] = new Scrollbar(elem, options);
        }
        return false;
    }
    tScroll.list = {};

    window.tScroll = tScroll;
    // 支持amd和cmd
    if (typeof define === "function") {
        if (define.amd) {
            define("tScroll", [], function() {
                return tScroll;
            });
        } else if (define.cmd) {
            define(function(require, exports, module) {
                return tScroll;
            });
        }
    }
})();