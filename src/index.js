import {Marker, Panel, Popup, Plugin} from 'mini-tokyo-3d';
import livecamSVG from '../node_modules/@fortawesome/fontawesome-free/svgs/solid/video.svg';
import './livecam.css';

// Live camera URL
const LIVECAM_URL = 'https://mini-tokyo.appspot.com/livecam';

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

class LivecamPlugin extends Plugin {

    constructor(options) {
        super(Object.assign({
            clockModes: ['realtime'],
            viewModes: ['ground']
        }, options));

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
            backgroundImage: `url("${livecamSVG.replace('%3e', ' fill=\'white\'%3e')}")`
        };
        me.cameras = {};
        me.markers = {};
        me._onSelection = me._onSelection.bind(me);
        me._onDeselection = me._onDeselection.bind(me);
    }

    onEnabled() {
        const me = this,
            map = me._map,
            cameras = me.cameras;

        map.on('selection', me._onSelection);
        map.on('deselection', me._onDeselection);

        fetch(LIVECAM_URL).then(response => response.json()).then(data => {
            for (const item of data) {
                cameras[item.id] = item;
            }
            me._addMarkers();
            me.setVisibility(true);
        });
    }

    onDisabled() {
        const me = this,
            map = me._map;

        map.off('selection', me._onSelection);
        map.off('deselection', me._onDeselection);

        if (me.panel) {
            me._map.trackObject();
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

        if (!visible && me.panel) {
            me._map.trackObject();
        }
        for (const id of Object.keys(me.markers)) {
            me.markers[id].setVisibility(visible);
        }
    }

    _addMarkers() {
        const me = this,
            map = me._map,
            {lang} = map;

        for (const id of Object.keys(me.cameras)) {
            const {center, zoom, bearing, pitch, name, thumbnail} = me.cameras[id],
                element = createElement('div', {className: 'livecam-marker'}),
                selection = {id, selectionType: 'livecam'};
            let popup;

            me.markers[id] = new Marker({element})
                .setLngLat(center)
                .addTo(map)
                .on('click', () => {
                    map.trackObject(selection);
                    map.map.flyTo({center, zoom, bearing, pitch});
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
            me.panel = new LivecamPanel({camera: me.cameras[id]}).addTo(me._map);
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

export default function(options) {
    return new LivecamPlugin(options);
}
