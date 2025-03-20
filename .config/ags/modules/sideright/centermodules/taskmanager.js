const { GLib } = imports.gi;
import Widget from 'resource:///com/github/Aylur/ags/widget.js';
import * as Utils from 'resource:///com/github/Aylur/ags/utils.js';
const { Box, Button, Icon, Label, Scrollable, Stack } = Widget;
const { execAsync, exec } = Utils;
import { MaterialIcon } from '../../.commonwidgets/materialicon.js';
import { setupCursorHover } from '../../.widgetutils/cursorhover.js';

let prevProcessTimes = new Map();
let prevSystemTime = 0;
const HERTZ = parseInt(exec('getconf CLK_TCK')) || 100;

const getSystemCPUTime = () => {
    try {
        const statContent = Utils.readFile('/proc/stat');
        const cpuTimes = statContent.split('\n')[0].split(/\s+/).slice(1, 5);
        return cpuTimes.reduce((acc, time) => acc + parseInt(time), 0);
    } catch (error) {
        return 0;
    }
};

const getProcessCPUTime = (pid) => {
    try {
        const statContent = Utils.readFile(`/proc/${pid}/stat`);
        if (!statContent) return null;

        const parts = statContent.split(' ');
        const utime = parseInt(parts[13]);
        const stime = parseInt(parts[14]);
        const cutime = parseInt(parts[15]);
        const cstime = parseInt(parts[16]);

        return {
            pid,
            total: utime + stime + cutime + cstime
        };
    } catch (error) {
        return null;
    }
};

const calculateCPUPercentage = (pid, currentProcTime, currentSystemTime) => {
    const prevProcTime = prevProcessTimes.get(pid);
    if (!prevProcTime) return 0;

    const procTimeDiff = currentProcTime - prevProcTime;
    const systemTimeDiff = currentSystemTime - prevSystemTime;

    if (systemTimeDiff === 0) return 0;
    return (procTimeDiff / systemTimeDiff) * 100;
};

const ProcessItem = ({ name, pid, cpu, memory }) => {
    return Box({
        className: 'task-manager-item spacing-h-10',
        children: [
            MaterialIcon('memory', 'norm'),
            Box({
                vertical: true,
                children: [
                    Label({
                        xalign: 0,
                        className: 'txt-small txt',
                        label: `${name}`,
                    }),
                    Label({
                        xalign: 0,
                        className: 'txt-smaller txt-subtext',
                        label: `PID: ${pid} | CPU: ${cpu}% | MEM: ${memory}MB`,
                    }),
                ],
            }),
            Box({ hexpand: true }),
            Button({
                className: 'task-manager-button',
                child: MaterialIcon('close', 'small'),
                onClicked: async () => {
                    try {
                        await execAsync(['pkill', '-f', name]);
                        updateProcessList();
                    } catch (error) {
                        print(`Failed to kill process ${pid}:`, error);
                    }
                },
                setup: setupCursorHover,
            }),
        ],
    });
};

let processListBox = null;

const getProcessList = async () => {
    try {
        // Get system-wide CPU time
        const currentSystemTime = getSystemCPUTime();
        const newProcessTimes = new Map();

        // Get list of processes sorted by current MEM usage (using top)
        const topOutput = await execAsync(['top', '-b', '-n', '1', '-o', '%MEM', '-w', '512']);
        const processes = topOutput.split('\n')
            .slice(7)
            .filter(line => line.trim())
            .map(line => {
                const parts = line.trim().split(/\s+/);
                return {
                    pid: parseInt(parts[0]),
                    cpu: parseFloat(parts[8]),
                    memory: (parseFloat(parts[5]) / 1024).toFixed(1),
                    name: parts.slice(11).join(' ')
                };
            });

        processes.forEach(proc => {
            const procTime = getProcessCPUTime(proc.pid);
            if (procTime) {
                newProcessTimes.set(proc.pid, procTime.total);
                if (prevProcessTimes.has(proc.pid)) {
                    proc.cpu = calculateCPUPercentage(proc.pid, procTime.total, currentSystemTime);
                }
            }
        });
        prevProcessTimes = newProcessTimes;
        prevSystemTime = currentSystemTime;

        // Sort processes by memory usage and get top 20
        const topProcesses = processes.sort((a, b) => b.memory - a.memory).slice(0, 20);
        return topProcesses;
    } catch (error) {
        print('Error getting process list:', error);
        return [];
    }
};

const updateProcessList = async () => {
    const processes = await getProcessList();
    processListBox.children = processes.map(proc => ProcessItem({
        ...proc,
        cpu: proc.cpu.toFixed(1)
    }));
};

export default () => {
    processListBox = Box({
        vertical: true,
        className: 'task-manager-box spacing-v-5',
    });

    const widget = Box({
        vertical: true,
        className: 'task-manager-widget',
        children: [
            Box({
                className: 'task-manager-header spacing-h-5',
                children: [
                    MaterialIcon('monitor_heart', 'norm'),
                    Label({
                        xalign: 0,
                        className: 'txt txt-bold',
                        label: 'System Monitor',
                    }),
                    Box({ hexpand: true }),
                    Button({
                        className: 'task-manager-refresh-button',
                        child: MaterialIcon('refresh', 'small'),
                        onClicked: updateProcessList,
                        setup: setupCursorHover,
                    }),
                ],
            }),
            Scrollable({
                vexpand: true,
                className: 'task-manager-scrollable',
                child: processListBox,
            }),
        ],
    });
    Utils.interval(2000, () => {
        updateProcessList();
        return true;
    });
    updateProcessList();
    return widget;
};