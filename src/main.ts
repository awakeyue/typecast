import "./style.css"
import Typecast from "../lib/typedLine"

;(async () => {
  const el = document.querySelector("#app")
  if (el) {
    const typecast = new Typecast(el as HTMLElement, {
      text: "",
      speed: 20,
      reverseDelay: 2000,
      reverseSpeed: 10,
      renderType: 'markdown',
      // loop: true,
      cursor: {
        char: '▍',
        autoHide: false,
      }
    })
    const fetchCookingTutorial = async () => {
      const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
        method: 'POST',
        body: JSON.stringify({
          model: 'glm-4v-flash',
          messages: [
            {
              role: 'user',
              content:
                '现在开始，你是一个大厨，只要我输入任何一个菜名，你都会给我回复这道菜的制作步骤',
            },
            {
              role: 'system',
              content: `好的，现在开始，你说一个菜名，我会给你回复这道菜的制作步骤`,
            },
            {
              role: 'user',
              content: `${'辣椒炒腊肠'}`,
            },
            // {
            //   role: 'user',
            //   content: '用js写一个快速排序'
            // }
          ],
          stream: true,
        }),
        headers: {
          Authorization: `Bearer 54ddca563f7c89c92cc80a48a0d394c7.wOqmEJIJI42NjIqr`,
          'Content-Type': 'application/json',
        },
      })
      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader?.read()
        if (done) {
          console.log('Done', value)
          break
        }
        const chunkValue = decoder.decode(value)
        const dataLines = chunkValue.split('\n').filter(line => line.startsWith('data:'))
  
        for (const line of dataLines) {
          try {
            const valueString = line.substring(5) // 截取 'data:' 后的内容
            if (valueString.trim() === '[DONE]') break
            const data = JSON.parse(valueString)
            const message = data.choices[0].delta.content
            typecast.addText(message)
          } catch (error) {
            console.log('json 解析失败', error)
          }
        }
      }
    }
    fetchCookingTutorial()
  }
})()
