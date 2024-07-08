import {Marker, Panel, Popup} from 'mini-tokyo-3d';
import livecamSVG from '@fortawesome/fontawesome-free/svgs/solid/video.svg';
import './livecam.css';

// Live camera URL
const LIVECAM_URL = 'https://mini-tokyo.appspot.com/livecam';

// Refresh interval (5 minutes)
const REFRESH_INTERVAL = 300000;

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
            es: 'Cámaras en vivo',
            fr: 'Caméras en direct',
            ja: 'ライブカメラ',
            ko: '실시간 웹캠',
            ne: 'प्रत्यक्ष क्यामेरा',
            pt: 'Câmeras ao vivo',
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
        me._onSelection = me._onSelection.bind(me);
        me._onDeselection = me._onDeselection.bind(me);
    }

    onAdd(map) {
        this.map = map;
    }

    onEnabled() {
        const me = this,
            map = me.map;

        map.on('selection', me._onSelection);
        map.on('deselection', me._onDeselection);

        const repeat = () => {
            const now = performance.now();

            if (Math.floor(now / REFRESH_INTERVAL) !== Math.floor(me._lastCameraRefresh / REFRESH_INTERVAL)) {
                fetch(LIVECAM_URL)
                    .then(response => response.json())
                    .then(data => me._updateCameras(data));
                me._lastCameraRefresh = now;
            }
            me._frameRequestID = requestAnimationFrame(repeat);
        };

        repeat();
    }

    onDisabled() {
        const me = this,
            {map, panel} = me;

        map.off('selection', me._onSelection);
        map.off('deselection', me._onDeselection);

        if (panel) {
            map.trackObject();
            panel.remove();
            delete me.panel;
        }

        cancelAnimationFrame(me._frameRequestID);
        delete me._lastCameraRefresh;

        me._updateCameras([]);
    }

    onVisibilityChanged(visible) {
        const me = this,
            {map, panel, cameras} = me;

        me.visible = visible;

        if (!visible && panel) {
            map.trackObject();
        }
        for (const id of Object.keys(cameras)) {
            cameras[id].marker.setVisibility(visible);
        }
    }

    _updateCameras(data) {
        const me = this,
            {map, cameras, visible} = me,
            lang = map.lang;

        for (const item of data) {
            const id = item.id,
                camera = cameras[id];

            if (camera) {
                Object.assign(camera, item);
                camera.marker.setLngLat(item.center);
                camera.updated = true;
                continue;
            }

            const element = createElement('div', {className: 'livecam-marker'}),
                marker = new Marker({element})
                    .setLngLat(item.center)
                    .addTo(map)
                    .setVisibility(visible)
                    .on('click', () => {
                        const {center, zoom, bearing, pitch} = cameras[id];

                        map.trackObject({id, selectionType: 'livecam'});
                        map.getMapboxMap().flyTo({center, zoom, bearing, pitch});
                    })
                    .on('mouseenter', () => {
                        const {center, name, thumbnail} = cameras[id];

                        cameras[id].popup = new Popup()
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
                        if (cameras[id].popup) {
                            cameras[id].popup.remove();
                            delete cameras[id].popup;
                        }
                    });

            cameras[id] = Object.assign({marker, updated: true}, item);
        }

        for (const id of Object.keys(cameras)) {
            if (cameras[id].updated) {
                delete cameras[id].updated;
            } else {
                if (cameras[id].popup) {
                    cameras[id].popup.remove();
                }
                cameras[id].marker.remove();
                delete cameras[id];
            }
        }
    }

    _onSelection(event) {
        if (event.selectionType === 'livecam') {
            const me = this,
                camera = me.cameras[event.id];

            camera.marker.setActivity(true);
            me.panel = new LivecamPanel({camera}).addTo(me.map);
        }
    }

    _onDeselection(event) {
        if (event.selectionType === 'livecam') {
            const me = this,
                camera = me.cameras[event.id],
                panel = me.panel;

            if (camera && camera.marker) {
                camera.marker.setActivity(false);
            }
            if (panel) {
                panel.remove();
                delete me.panel;
            }
        }
    }

}

export default function() {
    return new LivecamPlugin();
}
