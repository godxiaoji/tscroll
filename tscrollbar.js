/**
 * tScrollbar
 * @Author  Travis(LinYongji)
 * @Contact http://travisup.com/
 * @Version 1.0.0
 * @date    2013-04-27
 */
(function() {
    
    var rQuickExpr = /^(?:#([\w-]+)|\.([\w-]+))$/,
        rWhitespace = /(^\s+)|(\s+$)/g,
        eBody;

    // 获取特定元素
    function getMatchElem(selector, parent, nodes) {
        var rets = [],
            i = 0,
            m,
            match;
        
        if(selector.nodeType === 1) {
            return selector;
        }
        match = rQuickExpr.exec(selector);
        if (match) {
            if ((m = match[1])) {
                return document.getElementById(m);
            }
            else if ((m = match[2])) {
                parent = parent || document;
                if(!nodes && parent.getElementsByClassName) {
                    rets = parent.getElementsByClassName(m);
                } else {
                    nodes = nodes || parent.getElementsByTagName('*');
                    for(; i < nodes.length; i++) {
                        if (nodes[i].nodeType === 1 && hasClass(nodes[i], m)) {
                            rets.push(nodes[i]);
                            break;
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
        } else if (document.attachEvent) {
            elem.attachEvent('on' + type, fn);
        } else {
            elem['on' + type] = fn;
        }
    }
    function removeEvent(elem, type, fn) {
        if (elem.removeEventListener) {
            elem.removeEventListener(type, fn, false);
        } else if (document.detachEvent) {
            elem.detachEvent('on' + type, fn);
        } else {
            elem['on' + type] = null;
        }
    }
    // 修复ie低版本事件
    function fixEvent(event) {
        if(typeof event.pageX === 'undefined') {
            event.pageX = event.clientX + (event && event.scrollLeft || document.body.scrollLeft || 0);
            event.pageY = event.clientY + (event && event.scrollTop || document.body.scrollTop || 0);
        }
        event.preventDefault = event.preventDefault || function () {
            window.event.returnValue = false;
        };
        return event;
    }
    // 主模块
    function Scrollbar(eWrap, custom) {
        var self = this,
            oViewport = {elem: getMatchElem('.viewport', null, eWrap.childNodes)},
            oContent = {elem: getMatchElem('.wholearea', null, oViewport.elem.childNodes)},
            oScrollbar = {elem: getMatchElem('.scrollbar', null, eWrap.childNodes)},
            oTrack = {elem: getMatchElem('.scrollbar-track', oScrollbar.elem)},
            oThumb = {elem: getMatchElem('.scrollbar-thumb', oScrollbar.elem)},
            iScroll = 0,
            iPosition = {start: 0, now: 0},
            iMouse = {start: 0, now: 0},
            sAxis = false,
            sDirection = 'top',
            sSize = 'Height',
            touchEvents = typeof document.documentElement.ontouchstart !== "undefined",

            options = {
                scroll: true, // 是否绑定滚动事件
                wheel: 40, // 滚动事件速度
                axis: 'y', // 滚动方向
                trackSize: 'auto', // 滚动条长度
                thumbSize: 'auto', // 滑块长度
                thumbMinSize: 10,  // 滑块最小长度
                lockScroll: true, // 锁定滚动事件不被外层接收
                invertScroll: false, // 移动设备反转滚动
                onSelect: true // ie低版本的鼠标按下选择问题
            };

        // 事件绑定
        function bindEvents() {
            // 拖动事件绑定
            if(!touchEvents) {
                addEvent(oThumb.elem, 'mousedown', start);
                addEvent(oTrack.elem, 'mouseup', drag);
            } else {
                // 触屏事件
                oViewport.elem.ontouchstart = function(event) {   
                    if(event.touches.length === 1) {
                        start(event.touches[0]);
                        event.stopPropagation();
                    }
                };
            }
            // 滚动事件绑定
            if(options.scroll) {
                if(window.addEventListener ) {
                    eWrap.addEventListener('DOMMouseScroll', wheel, false);
                    eWrap.addEventListener('mousewheel', wheel, false );
                    eWrap.addEventListener('MozMousePixelScroll', function(event) {
                        event.preventDefault();
                    }, false);
                } else {
                    // 低版本ie浏览器
                    eWrap.onmousewheel = wheel;
                }
            }
        }

        function wheel(event) {
            if(oContent.ratio < 1) {
                var event = fixEvent(event || window.event),
                    delta = event.wheelDelta ? event.wheelDelta / 120 : -event.detail / 3;
                
                iScroll -= delta * options.wheel;
                self.moveTo(iScroll);

                if(options.lockScroll || (iScroll !== (oContent.slideSize) && iScroll !== 0 )) {
                    event.preventDefault();
                }
            }
        }

        function start(event) {
            // 禁止选择
            addClass(eBody, 'no-select');
            if(options.onSelect) {
                eBody.onselectstart = function() {
                    return false;
                };
            }
            
            var event = fixEvent(event || window.event),
            thumbPos = parseInt(oThumb.elem.style[sDirection]);
            iMouse.start = sAxis ? event.pageX : event.pageY;
            iPosition.start = thumbPos == 'auto' ? 0 : thumbPos;

            if(!touchEvents) {
                addEvent(document, 'mousemove', drag);
                addEvent(document, 'mouseup', end);
                addEvent(oThumb.elem, 'mouseup', end);
            } else {
                // 触屏事件
                document.ontouchmove = function(event) {
                    event.preventDefault();
                    drag(event.touches[0]);
                };
                document.ontouchend = end;
            }
        }

        function drag(event) {
            if(oContent.ratio < 1) {
                var event = fixEvent(event || window.event);
                iMouse.now = sAxis ? event.pageX : event.pageY;
                if(options.invertscroll && touchEvents) {
                    // 触屏反转事件
                    iPosition.now = Math.min((oTrack.slideSize), Math.max(0, (iPosition.start + (iMouse.start - iMouse.now))));
                } else {
                    iPosition.now = Math.min((oTrack.slideSize), Math.max(0, (iPosition.start + (iMouse.now - iMouse.start))));
                }
                iScroll = iPosition.now / oTrack.ratio;
                setPixelCss(oThumb.elem, sDirection, iPosition.now);
                setPixelCss(oContent.elem, sDirection, -iScroll);
            }
        }

        function end() {
            removeClass(eBody, 'no-select');
            if(options.onSelect) {
                eBody.onselectstart = null;
            }

            removeEvent(document, 'mousemove', drag);
            removeEvent(document, 'mouseup', end);
            removeEvent(oThumb.elem, 'mouseup', end);
            
            document.ontouchmove = document.ontouchend = null;
        }
                
        function initialize() {
            bindEvents();
            self.setting(custom);
            self.update();
        }
        
        this.setting = function(custom) {
            var i;
            if(typeof custom === 'object') {
                for(i in options) {
                    if(typeof custom[i] !== 'undefined') {
                        options[i] = custom[i];
                    }
                }
                sAxis = options.axis === 'x';
                sDirection = sAxis ? 'left' : 'top';
                sSize = sAxis ? 'Width' : 'Height';
            }
        };

        this.update = function(sScroll) {
            var sCssSize = sSize.toLowerCase();

            oViewport.size = oViewport.elem['offset' + sSize];
            oContent.size = oContent.elem['scroll' + sSize];
            oContent.slideSize = oContent.size - oViewport.size;
            oContent.ratio = parseFloat(oViewport.size) / oContent.size;

            if(oContent.ratio >= 1) {
                addClass(oScrollbar.elem, 'scrollbar-hide');
            } else {
                removeClass(oScrollbar.elem, 'scrollbar-hide');
            }
            oTrack.size = options.trackSize === 'auto' ? oViewport.size : options.trackSize;
            oThumb.size = options.thumbSize === 'auto' ? Math.max(oTrack.size * oContent.ratio, options.thumbMinSize) : options.thumbSize;
            oTrack.slideSize = oTrack.size - oThumb.size;
            oTrack.ratio = parseFloat(oTrack.slideSize) / oContent.slideSize;

            setPixelCss(oScrollbar.elem, sCssSize, oTrack.size);
            setPixelCss(oTrack.elem, sCssSize, oTrack.size);
            setPixelCss(oThumb.elem, sCssSize, oThumb.size);
            if(typeof sScroll !== 'undefined') {
                iScroll = sScroll === 'bottom' ? oContent.slideSize : parseInt(sScroll);
            }
            self.moveTo(iScroll);
        };

        this.moveTo = function(pos) {
            // 修正位置
            iScroll = Math.min((oContent.slideSize), Math.max(0, pos));
            // 设置样式
            setPixelCss(oThumb.elem, sDirection, iScroll * oTrack.ratio);
            setPixelCss(oContent.elem, sDirection, -iScroll);
        };

        initialize();
        return this;
    }
    
    window.tScrollbar = function(selector, options) {
        var elem = getMatchElem(selector);
        eBody = eBody || document.getElementsByTagName('body')[0];
        return elem ? new Scrollbar(elem, options) : false;
    }
})();