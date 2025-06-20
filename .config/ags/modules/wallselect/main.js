import Widget from "resource:///com/github/Aylur/ags/widget.js";
import * as Utils from "resource:///com/github/Aylur/ags/utils.js";
import App from "resource:///com/github/Aylur/ags/app.js";
import clickCloseRegion from '../.commonwidgets/clickcloseregion.js';
const { GLib } = imports.gi;
const { Box, EventBox, Scrollable, Label } = Widget;

let cachedContent = null;
let wallpaperPaths = [];
let visiblePaths = [];
let isLoading = false;

// Constants
const THUMBNAIL_DIR = GLib.build_filenamev([
    GLib.get_home_dir(),
    ".cache",
    "wallpapers",
]);
const WALLPAPER_DIR = GLib.build_filenamev([
    GLib.get_home_dir(),
    "Pictures",
    "Wallpapers",
]);

// Read bar position from config
const getBarPosition = () => {
    try {
        const configPath = GLib.get_home_dir() + "/.ags/config.json";
        const config = JSON.parse(Utils.readFile(configPath));
        return config.bar?.position || "top";
    } catch (error) {
        console.error("Error reading config:", error);
        return "top";
    }
};

// Wallpaper Button
const WallpaperButton = (thumbnailPath) => {
    const wallpaperPath = GLib.build_filenamev([
        WALLPAPER_DIR,
        GLib.path_get_basename(thumbnailPath)
    ]);

    return Widget.Button({
        className: 'wallpaper-btn',
        child: Widget.Box({
            className: "preview-box",
            css: `background-image: url("${thumbnailPath}");`,
        }),
        onClicked: () => {
            Utils.execAsync(`sh ${GLib.get_home_dir()}/.config/ags/scripts/color_generation/switchwall.sh "${wallpaperPath}"`);
            App.closeWindow("wallselect");
        },
        setup: (self) => {
            self.on('enter-notify-event', () => {
                self.toggleClassName('wallpaper-hovered', true);
            });
            self.on('leave-notify-event', () => {
                self.toggleClassName('wallpaper-hovered', false);
            });
        }
    });
};

// Get Wallpaper Paths
const getWallpaperPaths = async () => {
    try {
        const files = await Utils.execAsync(
            `find ${GLib.shell_quote(THUMBNAIL_DIR)} -type f \\( -iname "*.jpg" -o -iname "*.png" -o -iname "*.gif" -o -iname "*.jpeg" \\)`,
        );
        return files.split("\n").filter((file) => file);
    } catch (error) {
        console.error("Error discovering thumbnails:", error);
        return [];
    }
};

// Debounced Scroll Event
const debouncedScroll = (scroll, delay = 50) => {
    let timeoutId;
    let lastScrollTime = 0;
    
    return (event) => {
        // Предотвращаем слишком частую прокрутку
        const now = Date.now();
        if (now - lastScrollTime < 50) return;
        lastScrollTime = now;

        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            const adj = scroll.get_hadjustment();
            const scrollValue = adj.get_value();
            
            // Плавная прокрутка с учетом направления
            if (event.direction === 'up') {
                adj.set_value(Math.max(0, scrollValue - adj.get_step_increment()));
            } else {
                const maxScroll = adj.get_upper() - adj.get_page_size();
                adj.set_value(Math.min(maxScroll, scrollValue + adj.get_step_increment()));
            }

            if (scrollValue + adj.get_page_size() >= adj.get_upper()) {
                loadMoreWallpapers();
            }
        }, delay);
    };
};

// Lazy Load Wallpapers
const loadMoreWallpapers = () => {
    if (isLoading || visiblePaths.length === wallpaperPaths.length) return;
    isLoading = true;

    const loadChunk = 50; // Load smaller batches for smoother scrolling
    const newPaths = wallpaperPaths.slice(
        visiblePaths.length,
        visiblePaths.length + loadChunk,
    );
    visiblePaths = [...visiblePaths, ...newPaths];

    cachedContent.child.children = visiblePaths.map(WallpaperButton);
    isLoading = false;
};

// Placeholder content when no wallpapers found
const createPlaceholder = () => Box({
    className: 'wallpaper-placeholder',
    vertical: true,
    vexpand: true,
    hexpand: true,
    spacing: 10,
    children: [
        Box({
            vertical: true,
            vpack: 'center',
            hpack: 'center',
            vexpand: true,
            children: [
                Label({
                    label: 'No wallpapers found.',
                    className: 'txt-large txt-bold',
                }),
                Label({
                    label: 'Generate thumbnails to get started, place wallpapers in ~/Pictures/Wallpapers.',
                    className: 'txt-norm txt-subtext',
                }),
            ],
        }),
    ],
});

const SliderControls = (scrollable) => {
    const positionIndicator = Widget.Label({
        className: 'wall-position-indicator',
        label: '1/1'
    });
    
    const updateIndicator = () => {
        const adj = scrollable.get_hadjustment();
        const current = Math.round(adj.get_value() / adj.get_page_size()) + 1;
        const total = Math.ceil(adj.get_upper() / adj.get_page_size());
        positionIndicator.label = `${current}/${total}`;
    };
    
    scrollable.get_hadjustment().connect('value-changed', updateIndicator);
    
    return Widget.Box({
        className: 'slider-controls',
        hpack: 'center',
        spacing: 10,
        children: [
            Widget.Button({
                className: 'slider-btn left',
                child: Widget.Icon({ icon: 'pan-start-symbolic', size: 24 }),
                onClicked: () => {
                    const adj = scrollable.get_hadjustment();
                    adj.set_value(Math.max(0, adj.get_value() - adj.get_page_size()));
                    updateIndicator();
                }
            }),
            positionIndicator,
            Widget.Button({
                className: 'slider-btn right',
                child: Widget.Icon({ icon: 'pan-end-symbolic', size: 24 }),
                onClicked: () => {
                    const adj = scrollable.get_hadjustment();
                    const maxScroll = adj.get_upper() - adj.get_page_size();
                    adj.set_value(Math.min(maxScroll, adj.get_value() + adj.get_page_size()));
                    updateIndicator();
                }
            })
        ]
    });
};
// Create Content
const createContent = async () => {
    if (cachedContent) return cachedContent;

    // Tambahkan loading indicator
    const loadingIndicator = Box({
        className: 'wallpaper-loading',
        vexpand: true,
        children: [
            Label({
                label: "Please wait...",
                className: "txt-large"
            })
        ]
    });

    // Tampilkan loading indicator terlebih dahulu
    cachedContent = Box({
        vertical: true,
        children: [loadingIndicator]
    });

    try {
        wallpaperPaths = await getWallpaperPaths();

        if (wallpaperPaths.length === 0) {
            return createPlaceholder();
        }

        // Load initial wallpapers
        visiblePaths = wallpaperPaths;

        const scroll = Scrollable({
            hexpand: true,
            vexpand: false,
            hscroll: "always",
            vscroll: "never",
            child: Box({
                className: "wallpaper-list",
                children: visiblePaths.map(WallpaperButton),
            }),
        });

        const handleScroll = debouncedScroll(scroll);
        const sliderControls = SliderControls(scroll);
        
        // Ganti konten dengan yang sebenarnya setelah load selesai
        cachedContent.children = [
            EventBox({
                onScrollUp: (event) => handleScroll({ direction: 'up', event }),
                onScrollDown: (event) => handleScroll({ direction: 'down', event }),
                onPrimaryClick: () => App.closeWindow("wallselect"),
                child: scroll,
            }),
            sliderControls
        ];

        return cachedContent;
    } catch (error) {
        console.error("Error loading wallpapers:", error);
        cachedContent.children = [
            Box({
                className: "wallpaper-error",
                vexpand: true,
                hexpand: true,
                children: [
                    Label({
                        label: "Error loading wallpapers. Check the console for details.",
                        className: "txt-large txt-error",
                    }),
                ],
            })
        ];
        return cachedContent;
    }
};

// Кнопка генерации превью
const GenerateButton = () => Widget.Button({
    className: 'button-accent generate-thumbnails',
    child: Box({
        children: [
            Widget.Icon({
                icon: 'view-refresh-symbolic',
                size: 16,
            }),
            Widget.Label({
                label: ' Generate Thumbnails',
            }),
        ],
    }),
    tooltipText: 'Regenerate all wallpaper thumbnails',
    onClicked: () => {
        Utils.execAsync([
            'bash',
            `${GLib.get_home_dir()}/.config/ags/scripts/generate_thumbnails.sh`
        ]).then(() => {
            cachedContent = null;
            App.closeWindow('wallselect');
            App.openWindow('wallselect');
        }).catch(console.error);
    },
});

// Main Window
export default () =>
    Widget.Window({
        name: "wallselect",
        anchor:
            getBarPosition() === "top"
                ? ["top", "left", "right"]
                : ["bottom", "left", "right"],
        visible: false,
        child: Box({
            vertical: true,
            children: [
                EventBox({
                    onPrimaryClick: () => App.closeWindow("wallselect"),
                }),
                Box({
                    vertical: true,
                    className: "sidebar-right spacing-v-15",
                    children: [
                        Box({
                            vertical: true,
                            className: "sidebar-module",
                            setup: (self) =>
                                self.hook(
                                    App,
                                    async (_, name, visible) => {
                                        if (name === "wallselect" && visible) {
                                            // Jalankan generate thumbnails saat window dibuka
                                            try {
                                                await Utils.execAsync([
                                                    'bash',
                                                    `${GLib.get_home_dir()}/.config/ags/scripts/generate_thumbnails.sh`
                                                ]);
                                                // Reset cache dan muat ulang konten
                                                cachedContent = null;
                                                wallpaperPaths = [];
                                                visiblePaths = [];
                                                const content = await createContent();
                                                self.children = [content];
                                            } catch (error) {
                                                console.error("Error generating thumbnails:", error);
                                                // Tetap tampilkan konten meski ada error
                                                const content = await createContent();
                                                self.children = [content];
                                            }
                                        }
                                    },
                                    "window-toggled",
                                ),
                        }),
                    ],
                }),
                clickCloseRegion({ name: 'wallselect', multimonitor: false, fillMonitor: 'vertical' })
            ],
        }),
    });