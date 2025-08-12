// memory-helper.js

// Memory Helper - Comandos úteis para o memory-serve
const MH = {
  // Buscar antes de criar
  async findOrCreate(name, type, observations) {
    try {
      // Busca primeiro
      const results = await KC.memory.search_nodes({ query: name });
      
      if (results?.entities?.length > 0) {
        console.log(`✓ Encontrado: ${name}`);
        // Adiciona novas observações
        await KC.memory.add_observations({
          observations: [{
            entityName: name,
            contents: observations
          }]
        });
        return "updated";
      }
      
      // Cria se não existe
      await KC.memory.create_entities({
        entities: [{
          name: name,
          entityType: type,
          observations: observations
        }]
      });
      return "created";
    } catch (e) {
      console.error("Erro memory:", e);
    }
  },
  
  // Busca inteligente
  search: async (termo) => {
    const results = await KC.memory.search_nodes({ query: termo });
    console.table(results?.entities?.map(e => ({
      Nome: e.name,
      Tipo: e.entityType,
      Obs: e.observations.length
    })));
    return results;
  },
  
  // Ver tudo
  all: async () => {
    const graph = await KC.memory.read_graph();
    console.log(`Total: ${graph.entities.length} entidades`);
    return graph;
  }
};

// Exportar global
window.MH = MH;

// Comandos rápidos
console.log(`
Memory Helper Carregado! 
- MH.findOrCreate(nome, tipo, ['obs1', 'obs2'])
- MH.search('termo')
- MH.all()
`);