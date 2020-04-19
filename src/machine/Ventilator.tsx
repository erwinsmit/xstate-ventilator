import * as React from "react";

import { assign, createMachine } from "xstate";
import { useMachine } from "@xstate/react";
import { VentilatorSvg, VentilatorSvgInner } from './svg';

const classNames = require('classnames');

type VentilatorEvents = { type: "CONNECT" } | { type: "DISCONNECT" } | { type: "SWITCHON" } | { type: "SWITCHOFF" } | { type: "TOGGLESPEED" } | { type: "TOGGLETURNING" };

interface VentilatorContext {
    temperature: number;
}

const getTemperature = assign<VentilatorContext>({
    temperature: (context, event, actionMeta) => {
        const state = actionMeta.state?.value as any;

        if (state?.running?.speed) {
            const speed = state.running.speed;

            switch (speed) {
                case 'highSpeed':
                    return 20;
                case 'mediumSpeed':
                    return 50;
                case 'lowSpeed':
                    return 70;
                default:
                    return 100;
            }
        }

        return 100;
    }
});

type VentilatorState =
    | {
        value: 'powerOff';
        context: VentilatorContext
    }
    | {
        value: 'idle';
        context: VentilatorContext;
    }
    | {
        value: 'running';
        context: VentilatorContext;
        running: {
            speed: 'lowSpeed' | 'mediumSpeed' | 'highSpeed'
            turning: 'off' | 'on'
        };

    };


const ventilator = createMachine<VentilatorContext, VentilatorEvents, VentilatorState>(
    {
        id: "ventilator",
        initial: "powerOff",
        context: {
            temperature: 100
        },
        states: {
            powerOff: {
                on: {
                    CONNECT: "idle"
                }
            },
            idle: {
                on: {
                    SWITCHON: "running.hist",
                    DISCONNECT: "powerOff"
                }
            },
            running: {
                type: "parallel",
                on: {
                    SWITCHOFF: "#ventilator.idle",
                    DISCONNECT: "#ventilator.powerOff"
                },
                states: {
                    hist: {
                        type: 'history',
                        history: 'deep' // optional; default is 'shallow'
                    },
                    speed: {
                        id: "speed",
                        initial: "lowSpeed",
                        states: {
                            lowSpeed: {
                                on: {
                                    TOGGLESPEED: {
                                        target: "mediumSpeed",
                                        actions: "getTemperature"
                                    }
                                }
                            },
                            mediumSpeed: {
                                on: {
                                    TOGGLESPEED: {
                                        target: "highSpeed",
                                        actions: "getTemperature"
                                    }
                                }
                            },
                            highSpeed: {
                                on: {
                                    TOGGLESPEED: {
                                        target: "lowSpeed",
                                        actions: "getTemperature"
                                    }
                                }
                            },
                        }
                    },
                    turning: {
                        initial: "off",
                        states: {
                            off: {
                                on: {
                                    TOGGLETURNING: "on"
                                }
                            },
                            on: {
                                on: {
                                    TOGGLETURNING: "off"
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    {
        actions: { getTemperature: getTemperature }
    }
);

export const Ventilator: React.FC = () => {
    const [current, send] = useMachine(ventilator, {devTools: true});

    console.log(current);

    return (
        <>
            <div>
                temperature: {current.context.temperature}
            </div>

            <button disabled={!current.matches('powerOff')} onClick={() => send("CONNECT")}>Connect</button>
            <button disabled={current.matches('powerOff')} onClick={() => send("DISCONNECT")}>Disconnect</button>
            <button disabled={!current.matches('idle')} onClick={() => send("SWITCHON")}>Switch on</button>
            <button disabled={!current.matches('running')} onClick={() => send("SWITCHOFF")}>Switch off</button>
            
            <button disabled={!current.matches('running')} onClick={() => send("TOGGLESPEED")}>Toggle speed</button>
            <button disabled={!current.matches('running')} onClick={() => send("TOGGLETURNING")}>Toggle turning</button>

            <div className={
                classNames(
                    'ventilator',
                    {

                        'ventilator--running': current.matches('running'),
                        // @ts-ignore
                        [`ventilator--${current.value?.running?.speed}`]: current.matches('running'),
                        // @ts-ignore
                        'ventilator--turning': current.value?.running?.turning === 'on'
                    }
                )
            }>
                <VentilatorSvg />

                <VentilatorSvgInner/>
            </div>

            <hr />
            {JSON.stringify(current.value)}
            >
        </>
    );
}
