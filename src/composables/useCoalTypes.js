import { reactive, ref } from 'vue'
import { fetchCoalTypePage } from '@/api/coalType'

export function useCoalTypes() {
  const coalOptions = ref([])
  const coalMap = reactive({})

  async function load() {
    const page = await fetchCoalTypePage({ current: 1, size: 500 })
    const records = page?.records ?? []
    coalOptions.value = records.map((r) => ({
      label: `${r.coalCode} ${r.coalName}`,
      value: r.id,
    }))
    for (const k of Object.keys(coalMap)) {
      delete coalMap[k]
    }
    for (const r of records) {
      coalMap[r.id] = r
    }
  }

  function coalLabel(id) {
    const r = coalMap[id]
    return r ? `${r.coalCode} ${r.coalName}` : id ?? '—'
  }

  return { coalOptions, coalMap, load, coalLabel }
}
