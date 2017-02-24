L.Handler.PolyDrag = L.Handler.extend({
    initialize: function (poly) {
        this._poly = poly;
    },

    addHooks: function () {
        var container = this._poly._path;
        if (!this._draggable) {
            this._draggable = new L.DraggablePoly(container, container)
            .on('dragstart', this._onDragStart, this)
            .on('drag', this._onDrag, this)
            .on('dragend', this._onDragEnd, this);
        }
        this._draggable.enable();
    },

    removeHooks: function () {
        this._draggable.disable();
    },

    moved: function () {
        return this._draggable && this._draggable._moved;
    },

    _onDragStart: function (e) {
        this._poly
            .fire('movestart')
            .fire('dragstart');
    },

    _onDrag: function (e) {
        this._poly
            .fire('move')
            .fire('drag', e.target._totalDiffVec);

        var map = this._poly._map;
        if(!map) return; // Sometimes can be. check why
        var oldLatLngs = this._poly.getLatLngs()[0];
        var newLatLngs = [];
        var i;
        for (i in oldLatLngs) {
            var oldContainerPoint = map.latLngToContainerPoint(oldLatLngs[i]);
            var newContainerPoint =
                oldContainerPoint.add(e.target._diffVec);
            newLatLngs.push(map.containerPointToLatLng(newContainerPoint));
        }

        this._poly.setLatLngs([newLatLngs]);

        this._poly
            .fire('move')
            .fire('drag');

    },

    _onDragEnd: function (e) {
        this._poly
            .fire('moveend')
            .fire('dragend', e.target._totalDiffVec);
    }
});

L.DraggablePoly = L.Draggable.extend({

    /* One key difference from parent class is that we can't use L.DomUtil.setPosition and L.DomUtil.getPosition
        with non-marker geometry */

    _onDown: function (e) {
        if (
            (!L.Browser.touch && e.shiftKey) ||
             ((e.which !== 1) && (e.button !== 1) && !e.touches)
        ) {
            return;
        }

        this._simulateClick = true;

        if (e.touches && e.touches.length > 1) {
            this._simulateClick = false;
            return;
        }

        var first = (e.touches && e.touches.length === 1 ? e.touches[0] : e);
        var el = first.target;

        L.DomEvent.stop(e);

        if (L.Browser.touch && el.tagName.toLowerCase() === 'a') {
            L.DomUtil.addClass(el, 'leaflet-active');
        }

        this._moved = false;
        if (this._moving) {
            return;
        }

        if (!L.Browser.touch) {
            L.DomUtil.disableTextSelection();
            this._setMovingCursor();
        }

        this._startPoint = new L.Point(first.clientX, first.clientY);

        L.DomEvent.on(document, L.Draggable.MOVE[e.type], this._onMove, this);
        L.DomEvent.on(document, L.Draggable.END[e.type], this._onUp, this);
    },

    _setMovingCursor: function () {
        L.DomUtil.addClass(document.body, 'leaflet-dragging');
    },

    _restoreCursor: function () {
        L.DomUtil.removeClass(document.body, 'leaflet-dragging');
    },

    _onMove: function (e) {
        if (e.touches && e.touches.length > 1) { return; }

        var first = (e.touches && e.touches.length === 1 ? e.touches[0] : e);
        if (this._moved) {
            this._lastPoint = this._newPoint;
        } else {
            this._lastPoint = this._startPoint;
        }
        this._newPoint = new L.Point(first.clientX, first.clientY);
        this._diffVec = this._newPoint.subtract(this._lastPoint);
        this._totalDiffVec = new L.Point(first.clientX, first.clientY).subtract(
            this._startPoint
        );


        if (!this._diffVec.x && !this._diffVec.y) { return; }

        L.DomEvent.stop(e);

        if (!this._moved) {
            this.fire('dragstart');
            this._moved = true;
        }

        this._moving = true;

        L.Util.cancelAnimFrame(this._animRequest);
        this._animRequest = L.Util.requestAnimFrame(
            this._updatePosition, this, true, this._dragStartTarget
        );
    },

    _updatePosition: function () {
        this.fire('predrag');
        this.fire('drag');
    },

    _onUp: function (e) {

        if( e.changedTouches && e.changedTouches.length > 1) { return;}
        var first = (e.changedTouches && e.changedTouches.length === 1 ? e.changedTouches[0] : e);

        this._totalDiffVec = new L.Point(first.clientX, first.clientY).subtract(
            this._startPoint
        );

        if (this._simulateClick && e.changedTouches) {
            var first = e.changedTouches[0];
            var el = first.target;
            var dist =
                (this._newPos && this._newPos.distanceTo(this._startPos)) ||
                0;

            if (el.tagName.toLowerCase() === 'a') {
                L.DomUtil.removeClass(el, 'leaflet-active');
            }

            if (dist < L.Draggable.TAP_TOLERANCE) {
                this._simulateEvent('click', first);
            }
        }

        if (!L.Browser.touch) {
            L.DomUtil.enableTextSelection();
            this._restoreCursor();
        }

        for (var i in L.Draggable.MOVE) {
            L.DomEvent
                .off(document, L.Draggable.MOVE[i], this._onMove)
                .off(document, L.Draggable.END[i], this._onUp);
        }

        if (this._moved) {
            // ensure drag is not fired after dragend
            L.Util.cancelAnimFrame(this._animRequest);

            this.fire('dragend');
        }
        this._moving = false;
    },

    _setMovingCursor: function () {
        L.DomUtil.addClass(document.body, 'leaflet-dragging');
    },

    _restoreCursor: function () {
        L.DomUtil.removeClass(document.body, 'leaflet-dragging');
    },


});
