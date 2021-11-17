import {Marker, Panel, Popup} from 'mini-tokyo-3d';
import livecamSVG from '@fortawesome/fontawesome-free/svgs/solid/video.svg';
import './livecam.css';

// Live camera URL
const LIVECAM_URL = 'https://mini-tokyo.appspot.com/livecam';

function addColor(url, color) {
    const encodedColor = color.replace('#', '%23');
    return url.replace('%3e', ` fill=\'${encodedColor}\' stroke=\'${encodedColor}\'%3e`);
}

function createElement(tagName, attributes, container) {
    const element = document.createElement(tagName);

    Object.assign(element, attributes);
    if (container) {
        container.appendChild(element);
    }
    return element;
}

class LivecamPanel extends Panel {

    constructor(options) {
        super(Object.assign({className: 'livecam-panel'}, options));
    }

    addTo(map) {
        const me = this,
            {name, html} = me._options.camera;

        me.setTitle(name[map.lang])
            .setHTML(html);
        return super.addTo(map);
    }

}

class LivecamPlugin {

    constructor() {
        const me = this;

        me.id = 'livecam';
        me.name = {
            en: 'Live Cameras',
            ja: 'ライブカメラ',
            ko: '실시간 웹캠',
            ne: 'प्रत्यक्ष क्यामेरा',
            th: 'กล้องถ่ายทอดสด',
            'zh-Hans': '实时摄像头',
            'zh-Hant': '實時攝像頭'
        };
        me.iconStyle = {
            backgroundSize: '32px',
            backgroundImage: `url("${addColor(livecamSVG, 'white')}")`
        };
        me.clockModes = ['realtime'];
        me.viewModes = ['ground'];
        me.cameras = {};
        me.markers = {};
        me._onSelection = me._onSelection.bind(me);
        me._onDeselection = me._onDeselection.bind(me);
    }

    onAdd(map) {
        this.map = map;
    }

    onEnabled() {
        const me = this,
            {map, cameras} = me;

        map.on('selection', me._onSelection);
        map.on('deselection', me._onDeselection);

        fetch(LIVECAM_URL).then(response => response.json()).then(data => {
            for (const item of data) {
                cameras[item.id] = item;
            }
            me._addMarkers();
        });
    }

    onDisabled() {
        const me = this,
            {map} = me;

        map.off('selection', me._onSelection);
        map.off('deselection', me._onDeselection);

        if (me.panel) {
            map.trackObject();
            me.panel.remove();
            delete me.panel;
        }

        for (const id of Object.keys(me.cameras)) {
            delete me.cameras[id];
        }
        for (const id of Object.keys(me.markers)) {
            me.markers[id].remove();
            delete me.markers[id];
        }
    }

    onVisibilityChanged(visible) {
        const me = this;

        me.visible = visible;

        if (!visible && me.panel) {
            me.map.trackObject();
        }
        for (const id of Object.keys(me.markers)) {
            me.markers[id].setVisibility(visible);
        }
    }

    _addMarkers() {
        const me = this,
            {map, visible} = me,
            {lang} = map;

        for (const id of Object.keys(me.cameras)) {
            const {center, zoom, bearing, pitch, name, thumbnail} = me.cameras[id],
                element = createElement('div', {className: 'livecam-marker'}),
                selection = {id, selectionType: 'livecam'};
            let popup;

            me.markers[id] = new Marker({element})
                .setLngLat(center)
                .addTo(map)
                .setVisibility(visible)
                .on('click', () => {
                    map.trackObject(selection);
                    map.getMapboxMap().flyTo({center, zoom, bearing, pitch});
                })
                .on('mouseenter', () => {
                    popup = new Popup()
                        .setLngLat(center)
                        .setHTML([
                            '<div class="thumbnail-image-container">',
                            '<div class="ball-pulse"><div></div><div></div><div></div></div>',
                            `<div class="thumbnail-image" style="background-image: url(\'${thumbnail}\');"></div>`,
                            '</div>',
                            `<div><strong>${name[lang]}</strong></div>`
                        ].join(''))
                        .addTo(map);
                })
                .on('mouseleave', () => {
                    if (popup) {
                        popup.remove();
                        popup = undefined;
                    }
                });
        }
    }

    _onSelection(event) {
        if (event.selectionType === 'livecam') {
            const me = this,
                {id} = event;

            me.markers[id].setActivity(true);
            me.panel = new LivecamPanel({camera: me.cameras[id]}).addTo(me.map);
        }
    }

    _onDeselection(event) {
        if (event.selectionType === 'livecam') {
            const me = this,
                marker = me.markers[event.id];

            if (marker) {
                marker.setActivity(false);
            }
            if (me.panel) {
                me.panel.remove();
                delete me.panel;
            }
        }
    }

}

export default function() {
    return new LivecamPlugin();
}
