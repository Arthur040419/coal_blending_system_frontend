<script setup>
import { computed } from 'vue'
import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'

const props = defineProps({
  /** 原始 Markdown 文本 */
  content: {
    type: String,
    default: '',
  },
})

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
})

const safeHtml = computed(() => {
  const raw = props.content ?? ''
  if (!raw.trim()) {
    return ''
  }
  const rendered = md.render(raw)
  return DOMPurify.sanitize(rendered)
})
</script>

<template>
  <div class="markdown-body" v-html="safeHtml" />
</template>

<style scoped>
.markdown-body {
  font-size: 14px;
  line-height: 1.55;
  color: inherit;
  word-break: break-word;
}

.markdown-body :deep(p) {
  margin: 0 0 0.5em;
}

.markdown-body :deep(p:last-child) {
  margin-bottom: 0;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  margin: 0.35em 0 0.5em;
  padding-left: 1.25em;
}

.markdown-body :deep(li) {
  margin: 0.15em 0;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3) {
  margin: 0.5em 0 0.35em;
  font-size: 1em;
  font-weight: 600;
}

.markdown-body :deep(code) {
  padding: 0.1em 0.35em;
  border-radius: 4px;
  font-size: 0.9em;
  background: rgba(0, 0, 0, 0.06);
}

.markdown-body :deep(pre) {
  margin: 0.5em 0;
  padding: 0.65em 0.75em;
  border-radius: 6px;
  overflow-x: auto;
  background: rgba(0, 0, 0, 0.06);
  font-size: 0.88em;
}

.markdown-body :deep(pre code) {
  padding: 0;
  background: transparent;
}

.markdown-body :deep(blockquote) {
  margin: 0.4em 0;
  padding-left: 0.75em;
  border-left: 3px solid rgba(0, 0, 0, 0.12);
  color: #64748b;
}

.markdown-body :deep(a) {
  color: var(--el-color-primary);
  text-decoration: none;
}

.markdown-body :deep(a:hover) {
  text-decoration: underline;
}

.markdown-body :deep(table) {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.92em;
  margin: 0.5em 0;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  border: 1px solid rgba(0, 0, 0, 0.1);
  padding: 0.35em 0.5em;
}
</style>
