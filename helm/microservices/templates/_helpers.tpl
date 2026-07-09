{{/*
Expand the name of the chart.
*/}}
{{- define "microservices.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "microservices.namespace" -}}
{{- .Values.namespace | default "microservices" }}
{{- end }}
