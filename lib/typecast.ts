import { marked } from "marked"

interface TypecastOptions {
  speed?: number
  text?: string

  delay?: number // 新增：延迟时间
  loop?: boolean
  reverseSpeed?: number // 新增：倒序速度
  reverseDelay?: number // 新增：倒序前的延迟时间

  isHMTL?: boolean
  isMarkdown?: boolean

  onComplete?: () => void
  onType?: (currentText: string) => void
  cursor?: {
    char?: string
    blinkSpeed?: number
    style?: Partial<CSSStyleDeclaration>
    hideDelay?: number
    autoHide?: boolean
  }
}

interface TextQueueItem {
  text: string
  startIndex?: number
  delay?: number
}

class Typecast {
  private element: HTMLElement
  private cursorElement: HTMLSpanElement
  private options: Required<TypecastOptions>
  private currentText: string = ""
  private currentIndex: number = 0
  private lastTime: number = 0
  private isPlaying: boolean = false
  private animationFrameId?: number
  private textQueue: TextQueueItem[] = []
  private currentQueueItem: TextQueueItem | null = null
  private cursorHideTimeout?: number
  private delayTimeout?: number
  private isReverse: boolean = false

  constructor(element: HTMLElement, options: TypecastOptions = {}) {
    this.element = element
    this.options = {
      speed: 100,
      text: "",
      delay: 0,
      loop: false,
      reverseSpeed: options.speed || 100, // 默认使用正向速度
      reverseDelay: 1000, // 默认1秒延迟
      isHMTL: false,
      isMarkdown: false,
      onComplete: () => {},
      onType: () => {},
      ...options,
      cursor: {
        char: "|",
        blinkSpeed: 800,
        hideDelay: 2000,
        autoHide: true,
        style: {
          color: "inherit",
          marginLeft: "2px"
        },
        ...(options.cursor || {})
      }
    }

    this.cursorElement = document.createElement("span")
    this.initCursor()

    if (this.options.text) {
      if (this.options.loop) {
        this.currentQueueItem = { text: this.options.text, delay: this.options.delay }
        if (this.options.delay) {
          this.delayTimeout = window.setTimeout(() => {
            this.start()
          }, this.options.delay)
        } else {
          this.start()
        }
      } else {
        this.addText(this.options.text, this.options.delay)
      }
    }
  }

  private initCursor(): this {
    this.cursorElement.textContent = this.options.cursor.char!
    Object.assign(this.cursorElement.style, {
      animation: `blink ${this.options.cursor.blinkSpeed}ms infinite`,
      ...this.options.cursor.style
    })

    const style = document.createElement("style")
    style.textContent = `
      @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0; }
      }
    `
    document.head.appendChild(style)

    this.element.appendChild(this.cursorElement)
    this.startCursorHideTimer()
    return this
  }

  private showCursor(): this {
    this.cursorElement.style.visibility = "visible"
    this.startCursorHideTimer()
    return this
  }

  private hideCursor(): this {
    this.cursorElement.style.visibility = "hidden"
    return this
  }

  private startCursorHideTimer(): this {
    if (this.cursorHideTimeout) {
      clearTimeout(this.cursorHideTimeout)
    }

    if (!this.isPlaying && this.options.cursor.autoHide) {
      this.cursorHideTimeout = window.setTimeout(() => {
        this.hideCursor()
      }, this.options.cursor.hideDelay)
    }
    return this
  }

  addText(text: string, delay?: number): this {
    if (this.options.loop) {
      console.warn("addText method is disabled when loop option is true")
      return this
    }
    this.textQueue.push({ text, delay })
    if (!this.isPlaying) {
      this.start()
    }
    return this
  }

  start(): this {
    if (this.isPlaying) return this
    this.isPlaying = true
    this.showCursor()
    if (this.currentQueueItem) {
      this.animate()
    } else if (!this.options.loop) {
      this.processNextItem()
    }
    return this
  }

  pause(): this {
    this.isPlaying = false
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
    }
    if (this.delayTimeout) {
      clearTimeout(this.delayTimeout)
    }
    if (this.currentQueueItem && !this.options.loop) {
      this.currentQueueItem.startIndex = this.currentIndex
    }
    this.startCursorHideTimer()
    return this
  }

  reset(): this {
    this.pause()
    this.currentText = ""
    this.currentIndex = 0
    this.textQueue = []
    this.currentQueueItem = this.options.loop
      ? { text: this.options.text, delay: this.options.delay }
      : null
    this.isReverse = false
    this.element.textContent = ""
    this.element.appendChild(this.cursorElement)
    if (this.cursorHideTimeout) {
      clearTimeout(this.cursorHideTimeout)
    }
    if (this.delayTimeout) {
      clearTimeout(this.delayTimeout)
    }
    this.startCursorHideTimer()
    return this
  }

  private processNextItem(): this {
    if (this.textQueue.length === 0) {
      this.isPlaying = false
      this.options.onComplete()
      this.startCursorHideTimer()
      return this
    }

    this.currentQueueItem = this.textQueue.shift() || null

    if (this.currentQueueItem?.delay) {
      this.delayTimeout = window.setTimeout(() => {
        this.currentQueueItem = null
        this.processNextItem()
      }, this.currentQueueItem.delay)
      return this
    }

    this.currentIndex = this.currentQueueItem?.startIndex || 0
    this.animate()
    return this
  }

  private animate(timestamp: number = 0): void {
    if (!this.isPlaying || !this.currentQueueItem) return

    const elapsed = timestamp - this.lastTime
    const currentSpeed = this.isReverse ? this.options.reverseSpeed : this.options.speed

    if (elapsed >= currentSpeed) {
      this.lastTime = timestamp
      this.showCursor()

      if (this.options.loop) {
        this.handleLoopAnimation()
      } else {
        this.handleQueueAnimation()
      }
    }

    this.animationFrameId = requestAnimationFrame(this.animate.bind(this))
  }

  private handleLoopAnimation(): void {
    if (!this.currentQueueItem) return

    const { text } = this.currentQueueItem

    if (!this.isReverse) {
      if (this.currentIndex < text.length) {
        const char = text.charAt(this.currentIndex)
        this.currentText += char
        this.currentIndex++
      } else {
        this.isReverse = true
        this.pause()
        this.delayTimeout = window.setTimeout(() => {
          this.start()
        }, this.options.reverseDelay)
        return
      }
    } else {
      if (this.currentIndex > 0) {
        this.currentIndex--
        this.currentText = text.substring(0, this.currentIndex)
      } else {
        this.isReverse = false
        this.pause()
        this.delayTimeout = window.setTimeout(() => {
          this.start()
        }, this.options.delay)
        return
      }
    }

    this.updateText()
    this.options.onType(this.currentText)
  }

  private handleQueueAnimation(): void {
    if (!this.currentQueueItem) return

    if (this.currentIndex < this.currentQueueItem.text.length) {
      const char = this.currentQueueItem.text.charAt(this.currentIndex)
      this.currentText += char
      this.currentIndex++

      this.updateText()

      this.options.onType(this.currentText)
    } else {
      this.processNextItem()
    }
  }

  private updateText(): void {
    this.element.innerHTML = ""

    if (this.options.isHMTL || this.isHTML(this.currentText)) {
      this.element.appendChild(this.parseHTML(this.currentText))
    } else if (this.options.isMarkdown || this.isMarkdown(this.currentText)) {
      this.element.appendChild(this.parseMarkdown(this.currentText))
    } else {
      const textNode = document.createTextNode(this.currentText)
      this.element.appendChild(textNode)
    }
    this.element.appendChild(this.cursorElement)
  }

  private parseHTML(text: string): DocumentFragment {
    const template = document.createElement("template")
    template.innerHTML = text
    return template.content
  }

  private parseMarkdown(text: string): DocumentFragment {
    const html = marked(text) as string // 使用 markdown 解析库将 markdown 转换为 HTML
    return this.parseHTML(html)
  }

  private isMarkdown(value: string): boolean {
    const tokenTypes: string[] = []
    // 使用marked的walkTokens选项来遍历Markdown的token
    marked(value, {
      walkTokens: (token) => {
        tokenTypes.push(token.type)
      }
    })
    // 检查tokenTypes中是否包含Markdown的特定类型
    const isMarkdown = [
      "space",
      "code",
      "fences",
      "heading",
      "hr",
      "link",
      "blockquote",
      "list",
      "html",
      "def",
      "table",
      "lheading",
      "escape",
      "tag",
      "reflink",
      "strong",
      "codespan",
      "url"
    ].some((tokenType) => tokenTypes.includes(tokenType))
    return isMarkdown
  }

  private isHTML(text: string): boolean {
    const doc = new DOMParser().parseFromString(text, "text/html")
    return Array.from(doc.body.childNodes).some((node) => node.nodeType === 1)
  }
}

export default Typecast
