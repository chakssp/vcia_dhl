### **1. Configuração Inicial no N8N**

- **Acesso ao N8N:**
    - Acesse o N8N via URL configurada na VPS (ex: `https://n8n.yourdomain.com`).
    - Verifique se a conexão com a rede **Tailscale** está ativa (IP público via Tailscale).

---

### **2. Fluxo para Teste de Conectividade com PostgreSQL**

**Objetivo:** Validar conexão com o PostgreSQL e ajustar parâmetros de schema/tabela.  
**Passos:**

1. **Node 1 (PostgreSQL):**
    
    - **Tipo:** PostgreSQL > "Select rows from a table"
    - **Parâmetros:**
        - **Schema:** `public` (ajustar conforme schema real).
        - **Table:** `test_table` (crie uma tabela de teste no PostgreSQL se necessário).
        - **Return_All:** `true`.
    - **Ação:** Executar consulta para validar conexão.
2. **Node 2 (Debug):**
    
    - **Tipo:** Debug
    - **Ação:** Exibir resultados da consulta (se bem-sucedida, exibirá dados da tabela; se falhar, exibirá erro).
3. **Node 3 (Redis - OPCIONAL):**
    
    - **Tipo:** Redis > "Set"
    - **Parâmetros:**
        - **Name:** `test_cache`
        - **Key:** `test_key`
        - **Valor:** `{"test": "value"}`
    - **Ação:** Armazenar dado temporário para validar Redis.

---

### **3. Fluxo para Teste de Conectividade com RabbitMQ**

**Objetivo:** Validar conexão com RabbitMQ e ajustar parâmetros de fila.  
**Passos:**

1. **Node 1 (RabbitMQ):**
    
    - **Tipo:** RabbitMQ > "Send to Queue"
    - **Parâmetros:**
        - **Queue/Topic:** `test_queue` (crie a fila no RabbitMQ se necessário).
        - **Send Input Data:** `true`
        - **Payload:** `{"test": "message"}`
    - **Ação:** Enviar mensagem para a fila.
2. **Node 2 (Debug):**
    
    - **Tipo:** Debug
    - **Ação:** Exibir status da mensagem enviada (sucesso ou erro).
3. **Node 3 (Redis - OPCIONAL):**
    
    - **Tipo:** Redis > "Get"
    - **Parâmetros:**
        - **Name:** `test_cache`
        - **Key:** `test_key`
    - **Ação:** Validar se o dado armazenado no Redis foi recuperado.

---

### **4. Fluxo para Teste de Conectividade com Supabase e Google Drive (Exemplo)**

**Objetivo:** Replicar fluxos já funcionais para validação.  
**Passos:**

1. **Node 1 (Supabase):**
    
    - **Tipo:** Supabase > "Get many rows"
    - **Ação:** Verificar se retorna dados de configuração (ex: `realtime-dev`).
2. **Node 2 (Google Drive):**
    
    - **Tipo:** Google Drive > "Get shared drives"
    - **Parâmetros:**
        - **Return_All:** `true`
    - **Ação:** Verificar se retorna `[]` (ausência de dados).

---

### **5. Configurações Adicionais**

- **Acesso à VPS via Tailscale:**
    
    - Certifique-se de que a VPS (Hostinger) está configurada para permitir conexões via Tailscale.
    - Use o IP Tailscale da VPS para acessar o N8N (ex: `https://<tailscale-ip>:5678`).
- **Teste de Conectividade com Cache (Redis):**
    
    - Use o fluxo Redis para armazenar/chamar dados e validar se o cache está ativo.

---

### **6. Resultados Esperados**

- **PostgreSQL:**
    
    - Se bem-sucedido, o Debug mostrará dados da tabela `test_table`.
    - Se falhar, ajuste o schema/table ou crie a tabela de teste.
- **RabbitMQ:**
    
    - Se bem-sucedido, o Debug mostrará "Message sent successfully".
    - Se falhar, crie a fila `test_queue` ou ajuste o nome da fila.
- **Redis/Supabase/Google Drive:**
    
    - Confirmar que os fluxos existentes funcionam conforme o esperado.

---

### **Próxima Etapa**

- Após validar os fluxos acima, execute testes de carga com dados simulados para avaliar desempenho sob carga.

**Nota:** Os fluxos acima podem ser replicados no N8N para validação contínua. Se precisar, posso gerar um diagrama visual do fluxo (via texto) para facilitar a replicação.