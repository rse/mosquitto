/*
**  Mosquitto -- Mosquitto MQTT Broker Control
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under MIT license <https://spdx.org/licenses/MIT>
*/

/*  external dependencies  */
import { expect } from "chai"
import MQTT       from "mqtt"

/*  internal dependencies  */
import Mosquitto from "../dst/mosquitto.js"

/*  test suite  */
describe("Mosquitto Library", function () {
    it("TypeScript API sanity check", function () {
        /*  basic Mosquitto TypeScript API sanity check  */
        const mosquitto = new Mosquitto()
        expect(mosquitto).to.be.a("object")
        expect(mosquitto).to.respondTo("start")
        expect(mosquitto).to.respondTo("logs")
        expect(mosquitto).to.respondTo("stop")
    })
    it("Simple MQTT Broker Service", async function () {
        this.timeout(5000)

        /*  start Mosquitto  */
        const mosquitto = new Mosquitto({ debug: true })
        await mosquitto.start()

        /*  connect to Mosquitto  */
        const mqtt = MQTT.connect("mqtt://127.0.0.1:1883", {})
        await new Promise<void>((resolve, reject) => {
            mqtt.once("connect", ()    => { resolve() })
            mqtt.once("error",   (err) => { reject(err) })
        })
        mqtt.end()

        /*  stop Mosquitto  */
        await mosquitto.stop()
        await new Promise((resolve) => { setTimeout(resolve, 1000) })
        console.log(mosquitto.logs())
    })
    it("Publish/Subscribe Message Transfer", async function () {
        this.timeout(5000)

        /*  start Mosquitto  */
        const mosquitto = new Mosquitto({ debug: true })
        await mosquitto.start()

        /*  connect subscriber  */
        const sub = MQTT.connect("mqtt://127.0.0.1:1883", { username: "example", password: "example" })
        await new Promise<void>((resolve, reject) => {
            sub.once("connect", ()    => { resolve() })
            sub.once("error",   (err) => { reject(err) })
        })
        await new Promise<void>((resolve, reject) => {
            sub.subscribe("example/topic", (err) => {
                if (err) reject(err)
                else     resolve()
            })
        })

        /*  prepare message reception  */
        const received = new Promise<{ topic: string, payload: string }>((resolve) => {
            sub.once("message", (topic, payload) => {
                resolve({ topic, payload: payload.toString() })
            })
        })

        /*  connect publisher  */
        const pub = MQTT.connect("mqtt://127.0.0.1:1883", { username: "example", password: "example" })
        await new Promise<void>((resolve, reject) => {
            pub.once("connect", ()    => { resolve() })
            pub.once("error",   (err) => { reject(err) })
        })
        await new Promise<void>((resolve, reject) => {
            pub.publish("example/topic", "hello world", (err) => {
                if (err) reject(err)
                else     resolve()
            })
        })

        /*  verify message transfer  */
        const msg = await received
        expect(msg.topic).to.equal("example/topic")
        expect(msg.payload).to.equal("hello world")

        /*  disconnect clients  */
        pub.end()
        sub.end()

        /*  stop Mosquitto  */
        await mosquitto.stop()
        await new Promise((resolve) => { setTimeout(resolve, 1000) })
        console.log(mosquitto.logs())
    })
})

