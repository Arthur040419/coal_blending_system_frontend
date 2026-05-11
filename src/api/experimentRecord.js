import http from './http'

export function fetchExperimentRecordPage(params) {
  return http.get('/experimentRecord/page', { params })
}

export function fetchExperimentRadar(params) {
  return http.get('/experimentRecord/radar', { params })
}

export function fetchExperimentModelEffect(params) {
  return http.get('/experimentRecord/model-effect', { params })
}
