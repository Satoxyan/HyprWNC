import Widget from "resource:///com/github/Aylur/ags/widget.js";
import * as Utils from "resource:///com/github/Aylur/ags/utils.js";
import App from "resource:///com/github/Aylur/ags/app.js";
const { GLib } = imports.gi;
const { Box, EventBox, Scrollable, Label } = Widget;

let cachedContent = null;
let wallpaperPaths = [];
let visiblePaths = [];
let isLoading = false;

// Constants
const THUMBNAIL_DIR = GLib.build_filenamev([
    GLib.get_home_dir(),
    "Pictures",
    "Wallpapers",
    "thumbnails",
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
const WallpaperButton = (path) =>
    Widget.Button({
        child: Box({
            className: "preview-box",
            css: `background-image: url("${path}");`,
        }),
        onClicked: () => {
            Utils.execAsync(
                `sh ${GLib.get_home_dir()}/.config/ags/scripts/color_generation/switchwall.sh "${path.replace(
                    "thumbnails",
                    "",
                )}"`,
            );
            App.closeWindow("wallselect");
        },
    });

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

// Create Content
const createContent = async () => {
    if (cachedContent) return cachedContent;

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
        cachedContent = EventBox({
            onScrollUp: (event) => handleScroll({ direction: 'up', event }),
            onScrollDown: (event) => handleScroll({ direction: 'down', event }),
            onPrimaryClick: () => App.closeWindow("wallselect"),
            child: scroll,
        });

        return cachedContent;
    } catch (error) {
        console.error("Error loading wallpapers:", error);
        return Box({
            className: "wallpaper-error",
            vexpand: true,
            hexpand: true,
            children: [
                Label({
                    label: "Error loading wallpapers. Check the console for details.",
                    className: "txt-large txt-error",
                }),
            ],
        });
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
                            className: "wallselect-header",
                            children: [
                                Box({ hexpand: true }), // Пустое пространство для выравнивания
                                GenerateButton(),
                            ],
                        }),
                        Box({
                            vertical: true,
                            className: "sidebar-module",
                            setup: (self) =>
                                self.hook(
                                    App,
                                    async (_, name, visible) => {
                                        if (name === "wallselect" && visible) {
                                            const content =
                                                await createContent();
                                            self.children = [content];
                                        }
                                    },
                                    "window-toggled",
                                ),
                        }),
                    ],
                }),
            ],
        }),
    });