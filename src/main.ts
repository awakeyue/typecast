import "./style.css"
import Typecast from "../lib/typecast"

const delay = async (time: number) => {
  return new Promise((resolve) => {
    setTimeout(resolve, time)
  })
}
;(async () => {
  const el = document.querySelector("#app")
  if (el) {
    const typecast = new Typecast(el as HTMLElement, {
      text: "你好，我是 typecast",
      speed: 100,
      reverseDelay: 3000,
      reverseSpeed: 10,
      // isHMTL: true,
      // loop: true,
      cursor: {
        autoHide: false,
        char: "🐥",
        blinkSpeed: 1000,
        style: {
          color: "red",
          fontSize: "20px"
        }
      }
    })
    typecast.addText("")
    document.body.addEventListener("dblclick", () => {
      console.log("dbclick")
      typecast.reset()
    })
    document.body.addEventListener("click", () => {
      console.log("click")
      typecast.start()
    })
    document.body.addEventListener("keydown", () => {
      console.log("keydown")
      typecast.pause()
    })
    // await delay(1000)
    // typecast.pause()
    // await delay(1000)
    // typecast.start()
    // typecast
    //   .addText("青山不改，绿水长流1", 3000)
    //   .addText("青山不改，绿水长流2")
    //   .addText("青山不改，绿水长流3")
    // await delay(8000)
    // typecast.addText("   你好吗")
  }
})()
