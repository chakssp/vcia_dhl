# PowerShell Script para testar queries no Qdrant
$qdrantUrl = "http://qdr.vcia.com.br:6333"
$collection = "knowledge_consolidator"

Write-Host "=== TESTE DE QUERIES REAIS NO QDRANT ===" -ForegroundColor Green

# PESQUISA 1: Breakthrough Técnico
Write-Host "`n1. PESQUISA: Breakthrough Técnico" -ForegroundColor Yellow
$query1 = @{
    filter = @{
        must = @(
            @{
                key = "payload.analysisType"
                match = @{ value = "Breakthrough Técnico" }
            }
        )
    }
    limit = 10
    with_payload = @("fileName", "analysisType", "convergenceScore", "metadata.keywords")
    with_vector = $false
} | ConvertTo-Json -Depth 10

$response1 = Invoke-RestMethod -Uri "$qdrantUrl/collections/$collection/points/scroll" -Method Post -Body $query1 -ContentType "application/json"
Write-Host "Resultados encontrados: $($response1.result.points.Count)"
$response1.result.points | ForEach-Object { 
    Write-Host "  - $($_.payload.fileName) | Score: $($_.payload.convergenceScore)"
}

# PESQUISA 2: Keywords com "ia"
Write-Host "`n2. PESQUISA: Keywords com 'ia'" -ForegroundColor Yellow
$query2 = @{
    filter = @{
        should = @(
            @{
                key = "payload.metadata.keywords[]"
                match = @{ value = "ia" }
            }
        )
    }
    limit = 10
    with_payload = @("fileName", "metadata.keywords")
    with_vector = $false
} | ConvertTo-Json -Depth 10

$response2 = Invoke-RestMethod -Uri "$qdrantUrl/collections/$collection/points/scroll" -Method Post -Body $query2 -ContentType "application/json"
Write-Host "Resultados encontrados: $($response2.result.points.Count)"

# PESQUISA 3: Categoria Técnico
Write-Host "`n3. PESQUISA: Categoria Técnico" -ForegroundColor Yellow
$query3 = @{
    filter = @{
        should = @(
            @{
                key = "payload.metadata.categories[]"
                match = @{ value = "Técnico" }
            }
        )
    }
    limit = 10
    with_payload = @("fileName", "metadata.categories")
    with_vector = $false
} | ConvertTo-Json -Depth 10

$response3 = Invoke-RestMethod -Uri "$qdrantUrl/collections/$collection/points/scroll" -Method Post -Body $query3 -ContentType "application/json"
Write-Host "Resultados encontrados: $($response3.result.points.Count)"

# PESQUISA 4: Multi-dimensional
Write-Host "`n4. PESQUISA: Multi-dimensional (Breakthrough + ia + Técnico)" -ForegroundColor Yellow
$query4 = @{
    filter = @{
        must = @(
            @{
                key = "payload.analysisType"
                match = @{ value = "Breakthrough Técnico" }
            }
        )
        should = @(
            @{
                key = "payload.metadata.keywords[]"
                match = @{ value = "ia" }
            },
            @{
                key = "payload.metadata.categories[]"
                match = @{ value = "Técnico" }
            }
        )
    }
    limit = 20
    with_payload = @("fileName", "convergenceScore", "metadata.keywords", "metadata.categories")
    with_vector = $false
} | ConvertTo-Json -Depth 10

$response4 = Invoke-RestMethod -Uri "$qdrantUrl/collections/$collection/points/scroll" -Method Post -Body $query4 -ContentType "application/json"
Write-Host "Resultados encontrados: $($response4.result.points.Count)"

# PESQUISA 5: Convergence Chains
Write-Host "`n5. PESQUISA: Convergence Chains com tema 'vcia'" -ForegroundColor Yellow
$query5 = @{
    filter = @{
        should = @(
            @{
                key = "payload.convergenceChains[].theme"
                match = @{ value = "vcia - Breakthrough Técnico" }
            }
        )
    }
    limit = 10
    with_payload = @("fileName", "convergenceChains")
    with_vector = $false
} | ConvertTo-Json -Depth 10

$response5 = Invoke-RestMethod -Uri "$qdrantUrl/collections/$collection/points/scroll" -Method Post -Body $query5 -ContentType "application/json"
Write-Host "Resultados encontrados: $($response5.result.points.Count)"

Write-Host "`n=== RESUMO ===" -ForegroundColor Green
Write-Host "Total de pontos processados: $($response1.result.points.Count + $response2.result.points.Count + $response3.result.points.Count + $response4.result.points.Count + $response5.result.points.Count)"