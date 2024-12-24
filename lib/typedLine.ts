import { marked } from "marked"

interface TypecastOptions {
  speed?: number
  text?: string
  delay?: number
  loop?: boolean
  reverseSpeed?: number
  reverseDelay?: number
  renderType?: 'text' | 'html' | 'markdown'
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

class TypedLine {
  private element: HTMLElement
  private textContainer: HTMLElement
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
      reverseSpeed: options.speed || 100,
      reverseDelay: 1000,
      renderType: 'text',
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
    

    // 创建文本容器和光标元素
    this.textContainer = document.createElement("span")
    this.cursorElement = document.createElement("span")

    // markdown
    if (options.renderType === 'markdown') {
      this.textContainer.classList.add('markdown-body')
    }
    
    // 初始化结构
    this.element.appendChild(this.textContainer)
    this.element.appendChild(this.cursorElement)
    
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

  private updateText(): void {
    if (this.options.renderType === 'html' || this.options.renderType === 'markdown') {
      this.textContainer.innerHTML = marked(this.currentText) as string
    } else {
      this.textContainer.textContent = this.currentText
    }
    this.options.onType(this.currentText)
  }

  // 其余方法保持不变...
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
    this.textContainer.innerHTML = ""
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

    if (!this.isReverse) {
      if (this.currentIndex < this.currentQueueItem.text.length) {
        this.updateCurrentText('increase')
        this.updateText()
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
        this.updateCurrentText('decrease')
        this.updateText()
      } else {
        this.isReverse = false
        this.pause()
        this.delayTimeout = window.setTimeout(() => {
          this.start()
        }, this.options.delay)
        return
      }
    }
  }

  private handleQueueAnimation(): void {
    if (!this.currentQueueItem) return

    if (this.currentIndex < this.currentQueueItem.text.length) {
      this.updateCurrentText('increase')
      this.updateText()
    } else {
      this.processNextItem()
    }
  }

  private updateCurrentText(type: 'increase' | 'decrease'): void {
    if (!this.currentQueueItem) return

    if (type === 'increase') {
      const currentChar = this.currentQueueItem.text.charAt(this.currentIndex)
    
      if (currentChar === '<') {
        let tagContent = ''
        let tempIndex = this.currentIndex
      
        while (tempIndex < this.currentQueueItem.text.length) {
          const char = this.currentQueueItem.text.charAt(tempIndex)
          tagContent += char
          if (char === '>') {
            break
          }
          tempIndex++
        }
      
        this.currentText += tagContent
        this.currentIndex = tempIndex + 1
      } else {
        this.currentText += currentChar
        this.currentIndex++
      }
    } else if (type === 'decrease') {
      if (this.currentIndex > 0) {
        const prevChar = this.currentQueueItem.text.charAt(this.currentIndex - 1)
      
        if (prevChar === '>') {
          let tagEndIndex = this.currentIndex - 1
          let tagStartIndex = tagEndIndex
        
          while (tagStartIndex >= 0) {
            if (this.currentQueueItem.text.charAt(tagStartIndex) === '<') {
              break
            }
            tagStartIndex--
          }
        
          this.currentIndex = tagStartIndex
          this.currentText = this.currentQueueItem.text.substring(0, tagStartIndex)
        } else {
          this.currentIndex--
          this.currentText = this.currentQueueItem.text.substring(0, this.currentIndex)
        }
      }
    }
  }
}

export default TypedLine