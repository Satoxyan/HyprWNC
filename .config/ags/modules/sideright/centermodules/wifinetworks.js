import App from 'resource:///com/github/Aylur/ags/app.js';
import Network from "resource:///com/github/Aylur/ags/service/network.js";
import Variable from 'resource:///com/github/Aylur/ags/variable.js';
import Widget from 'resource:///com/github/Aylur/ags/widget.js';
import * as Utils from 'resource:///com/github/Aylur/ags/utils.js';
const { Box, Button, Entry, Icon, Label, Revealer, Scrollable, Slider, Stack, Overlay } = Widget;
const { execAsync, exec } = Utils;
import { MaterialIcon } from '../../.commonwidgets/materialicon.js';
import { setupCursorHover } from '../../.widgetutils/cursorhover.js';
import { ConfigToggle } from '../../.commonwidgets/configwidgets.js';

const MATERIAL_SYMBOL_SIGNAL_STRENGTH = {
    'network-wireless-signal-excellent-symbolic': "signal_wifi_4_bar",
    'network-wireless-signal-good-symbolic': "network_wifi_3_bar",
    'network-wireless-signal-ok-symbolic': "network_wifi_2_bar",
    'network-wireless-signal-weak-symbolic': "network_wifi_1_bar",
    'network-wireless-signal-none-symbolic': "signal_wifi_0_bar",
}

let connectAttempt = '';
let networkAuth = null;
let networkAuthSSID = null;
let passwordVisible = false;
let ethernetInterface = ''; // Variabel untuk menyimpan nama interface Ethernet

const WifiNetwork = (accessPoint) => {
    const networkStrength = MaterialIcon(MATERIAL_SYMBOL_SIGNAL_STRENGTH[accessPoint.iconName], 'hugerass')
    const networkName = Box({
        vertical: true,
        children: [
            Label({
                hpack: 'start',
                label: accessPoint.ssid
            }),
            accessPoint.active ? Label({
                hpack: 'start',
                className: 'txt-smaller txt-subtext',
                label: getString("Selected"),
            }) : null,
        ]
    });
    return Button({
        onClicked: accessPoint.active ? () => { } : () => {
            connectAttempt = accessPoint.ssid;
            networkAuthSSID.label = `${getString('Connecting to')}: ${connectAttempt}`;

            execAsync(['nmcli', '-g', 'NAME', 'connection', 'show'])
                .then((savedConnections) => {
                    const savedSSIDs = savedConnections.split('\n');

                    if (!savedSSIDs.includes(connectAttempt)) {
                        if (networkAuth) {
                            networkAuth.revealChild = true;
                        }
                    } else {
                        if (networkAuth) {
                            networkAuth.revealChild = false;
                        }
                        execAsync(['nmcli', 'device', 'wifi', 'connect', connectAttempt])
                            .catch(print);
                    }
                })
                .catch(print);
        },
        child: Box({
            className: 'sidebar-wifinetworks-network spacing-h-10',
            children: [
                networkStrength,
                networkName,
                Box({ hexpand: true }),
                accessPoint.active ? MaterialIcon('check', 'large') : null,
            ],
        }),
        setup: accessPoint.active ? () => { } : setupCursorHover,
    })
}

const NetResource = (icon, command) => {
    const resourceLabel = Label({
        className: `txt-smaller txt-subtext`,
    });
    const widget = Button({
        child: Box({
            hpack: 'start',
            className: `spacing-h-4`,
            children: [
                MaterialIcon(icon, 'very-small'),
                resourceLabel,
            ],
            setup: (self) => self.poll(2000, () => execAsync(['bash', '-c', command])
                .then((output) => {
                    resourceLabel.label = output;
                }).catch(print))
            ,
        })
    });
    return widget;
}

// Fungsi untuk mendeteksi nama interface Ethernet
const detectEthernetInterface = async () => {
    try {
        const output = await execAsync(['nmcli', '-t', '-f', 'DEVICE,TYPE', 'device', 'status']);
        const lines = output.split('\n');
        
        for (const line of lines) {
            const [device, type] = line.split(':');
            if (type === 'ethernet') {
                return device;
            }
        }
        return '';
    } catch (err) {
        console.error('Error detecting Ethernet interface:', err);
        return '';
    }
};

const CurrentNetwork = () => {
    const passwordVisible = Variable(false);
    let authLock = false;
    let timeoutId = null;
    const connectionType = Variable('none'); // 'wifi', 'ethernet', or 'none'

    const bottomSeparator = Box({
        className: 'separator-line',
    });
    
    const getCurrentConnectionInfo = async () => {
        try {
            // Deteksi interface Ethernet jika belum terdeteksi
            if (!ethernetInterface) {
                ethernetInterface = await detectEthernetInterface();
            }

            const output = await execAsync(['nmcli', '-t', '-f', 'DEVICE,TYPE,CONNECTION', 'device', 'status']);
            const lines = output.split('\n');
            
            let wifiActive = false;
            let ethernetActive = false;
            let currentConnection = 'Not connected';
            
            for (const line of lines) {
                const [device, type, connection] = line.split(':');
                // Gunakan ethernetInterface yang sudah terdeteksi
                if (device === ethernetInterface && type === 'ethernet' && connection) {
                    ethernetActive = true;
                    currentConnection = connection;
                    connectionType.value = 'ethernet';
                }
                if (device === 'wlan0' && type === 'wifi' && connection) {
                    wifiActive = true;
                    currentConnection = connection;
                    connectionType.value = 'wifi';
                }
            }
            
            if (!wifiActive && !ethernetActive) {
                connectionType.value = 'none';
            }
            
            return currentConnection;
        } catch (err) {
            connectionType.value = 'none';
            return 'Not connected';
        }
    };

    const networkName = Box({
        vertical: true,
        hexpand: true,
        children: [
            Label({
                hpack: 'start',
                className: 'txt-smaller txt-subtext',
                label: getString("Current network"),
            }),
            Label({
                hpack: 'start',
                label: '',
                setup: (self) => {
                    const updateLabel = async () => {
                        if (authLock) return;
                        self.label = await getCurrentConnectionInfo();
                    };
                    self.hook(Network, updateLabel);
                    self.poll(5000, updateLabel);
                },
            }),
        ]
    });

    const networkBandwidth = Box({
        vertical: true,
        hexpand: true,
        hpack: 'end',
        className: 'sidebar-wifinetworks-bandwidth',
        children: [
            NetResource('arrow_warm_up', `${App.configDir}/scripts/network_scripts/network_bandwidth.py sent`),
            NetResource('arrow_cool_down', `${App.configDir}/scripts/network_scripts/network_bandwidth.py recv`),
        ]
    });

    networkAuthSSID = Label({
        className: 'margin-left-5',
        hpack: 'start',
        hexpand: true,
        label: '',
    });
    
    const cancelAuthButton = Button({
        className: 'txt sidebar-wifinetworks-network-button',
        label: getString('Cancel'),
        hpack: 'end',
        onClicked: () => {
            passwordVisible.value = false;
            networkAuth.revealChild = false;
            authFailed.revealChild = false;
            networkAuthSSID.label = '';
            authEntry.text = '';
        },
        setup: setupCursorHover,
    });
    
    const authHeader = Box({
        vertical: false,
        hpack: 'fill',
        spacing: 10,
        children: [
            networkAuthSSID,
            cancelAuthButton
        ]
    });
    
    const authVisible = Button({
        vpack: 'center',
        child: MaterialIcon('visibility', 'large'),
        className: 'txt sidebar-wifinetworks-auth-visible',
        onClicked: (self) => {
            passwordVisible.value = !passwordVisible.value;
        },
        setup: (self) => {
            setupCursorHover(self)
            self.hook(passwordVisible, (self) => {
                self.child.label = passwordVisible.value ? 'visibility_off' : 'visibility';
            })
        },
    });
    
    const authFailed = Revealer({
        revealChild: false,
        child: Label({
            className: 'txt txt-italic txt-subtext',
            label: getString('Authentication failed'),
        }),
    })
    
    const authEntry = Entry({
        className: 'sidebar-wifinetworks-auth-entry',
        visibility: false,
        hexpand: true,
        onAccept: (self) => {
            authLock = false;
            execAsync(['nmcli', 'connection', 'delete', connectAttempt])
                .catch(() => { });

            execAsync(['nmcli', 'device', 'wifi', 'connect', connectAttempt, 'password', self.text])
                .then(() => {
                    connectAttempt = '';
                    networkAuth.revealChild = false;
                    authFailed.revealChild = false;
                    self.text = '';
                    passwordVisible.value = false;
                })
                .catch(() => {
                    networkAuth.revealChild = true;
                    authFailed.revealChild = true;
                });
        },
        setup: (self) => self.hook(passwordVisible, (self) => {
            self.visibility = passwordVisible.value
        }),
        placeholderText: getString('Enter network password'),
    });
    
    const authBox = Box({
        className: 'sidebar-wifinetworks-auth-box',
        children: [
            authEntry,
            authVisible,
        ]
    });
    
    const forgetButton = Button({
        label: getString('Forget'),
        className: 'txt sidebar-wifinetworks-network-button',
        onClicked: async () => {
            try {
                const currentConn = await getCurrentConnectionInfo();
                if (currentConn !== 'Not connected' && connectionType.value === 'wifi') {
                    await execAsync(['nmcli', 'connection', 'delete', currentConn]);
                }
            } catch (err) {
                Utils.execAsync(['notify-send',
                    "Network",
                    `Failed to forget network\n${err}`,
                    '-a', 'ags',
                ]).catch(print);
            }
        },
        setup: setupCursorHover,
    });
    
    const propertiesButton = Button({
        label: getString('Properties'),
        className: 'txt sidebar-wifinetworks-network-button',
        onClicked: async () => {
            try {
                const output = await execAsync('nmcli -t -f uuid connection show --active');
                if (output.trim()) {
                    Utils.execAsync(`nm-connection-editor --edit ${output.trim()}`);
                }
                closeEverything();
            } catch (err) {
                Utils.execAsync(['notify-send',
                    "Network",
                    `Failed to get connection UUID\n${err}`,
                    '-a', 'ags',
                ]).catch(print);
            }
        },
        setup: setupCursorHover,
    });
    
    const networkProp = Revealer({
        transition: 'slide_down',
        transitionDuration: userOptions.animations.durationLarge,
        child: Box({
            className: 'spacing-h-10',
            homogeneous: true,
            children: [
                propertiesButton,
                // Forget button will be added conditionally for WiFi
            ],
            setup: (self) => {
                // Dynamically update buttons based on connection type
                const updateButtons = () => {
                    if (connectionType.value === 'wifi') {
                        self.children = [propertiesButton, forgetButton];
                    } else {
                        self.children = [propertiesButton];
                    }
                };
                
                self.hook(connectionType, updateButtons);
                updateButtons();
            },
        }),
        setup: (self) => {
            const updateVisibility = async () => {
                const conn = await getCurrentConnectionInfo();
                self.revealChild = conn !== 'Not connected';
            };
            self.hook(Network, updateVisibility);
            self.poll(5000, updateVisibility);
        },
    });
    
    networkAuth = Revealer({
        transition: 'slide_down',
        transitionDuration: userOptions.animations.durationLarge,
        child: Box({
            className: 'margin-top-10 spacing-v-5',
            vertical: true,
            children: [
                authHeader,
                authBox,
                authFailed,
            ]
        }),
        setup: (self) => self.hook(Network, (self) => {
            execAsync(['nmcli', '-g', 'NAME', 'connection', 'show'])
                .then((savedConnections) => {
                    const savedSSIDs = savedConnections.split('\n');
                    if (Network.wifi?.state == 'failed' ||
                        (Network.wifi?.state == 'need_auth' && !savedSSIDs.includes(Network.wifi?.ssid))) {
                        authLock = true;
                        connectAttempt = Network.wifi?.ssid;
                        self.revealChild = true;
                        if (timeoutId) {
                            clearTimeout(timeoutId);
                        }
                        timeoutId = setTimeout(() => {
                            authLock = false;
                            passwordVisible.value = false;
                            self.revealChild = false;
                            authFailed.revealChild = false;
                            if (Network.wifi) {
                                Network.wifi.state = 'activated';
                            }
                        }, 60000);
                    }
                }
                ).catch(print);
        }),
    });
    
    const actualContent = Box({
        vertical: true,
        className: 'spacing-v-10',
        children: [
            Box({
                className: 'sidebar-wifinetworks-network',
                vertical: true,
                children: [
                    Box({
                        className: 'spacing-h-10 margin-bottom-10',
                        children: [
                            MaterialIcon('language', 'hugerass'),
                            networkName,
                            networkBandwidth,
                        ]
                    }),
                    networkProp,
                    networkAuth
                ]
            }),
            bottomSeparator,
        ]
    });
    
    return Box({
        vertical: true,
        children: [Revealer({
            transition: 'slide_down',
            transitionDuration: userOptions.animations.durationLarge,
            revealChild: true, // Always show for both WiFi and Ethernet
            child: actualContent,
        })]
    })
}

export default (props) => {
    const networkList = Box({
        vertical: true,
        className: 'spacing-v-10',
        children: [Overlay({
            passThrough: true,
            child: Scrollable({
                vexpand: true,
                child: Box({
                    attribute: {
                        'updateNetworks': (self) => {
                            const accessPoints = Network.wifi?.access_points || [];
                            self.children = Object.values(accessPoints.reduce((a, accessPoint) => {
                                if (!a[accessPoint.ssid] || a[accessPoint.ssid].strength < accessPoint.strength) {
                                    a[accessPoint.ssid] = accessPoint;
                                    a[accessPoint.ssid].active |= accessPoint.active;
                                }
                                return a;
                            }, {})).map(n => WifiNetwork(n));
                        },
                    },
                    vertical: true,
                    className: 'spacing-v-5 sidebar-centermodules-scrollgradient-bottom-contentmargin',
                    setup: (self) => self.hook(Network, self.attribute.updateNetworks),
                }),
            }),
            overlays: [Box({
                className: 'sidebar-centermodules-scrollgradient-bottom'
            })]
        })]
    });
    
    const bottomBar = Box({
        homogeneous: true,
        children: [Button({
            hpack: 'center',
            className: 'txt-small txt sidebar-centermodules-bottombar-button',
            onClicked: () => {
                execAsync(['bash', '-c', userOptions.apps.network]).catch(print);
                closeEverything();
            },
            label: getString('More'),
            setup: setupCursorHover,
        })],
    })
    
    return Box({
        ...props,
        className: 'spacing-v-10',
        vertical: true,
        children: [
            CurrentNetwork(),
            networkList,
            bottomBar,
        ]
    });
}