const resolvers = {
  Query: {
    me: () => {
      // Se implementará en HU-S1.6 con autenticación JWT
      return null;
    },
  },
  Mutation: {
    registro: () => {
      // Se implementará en HU-S1.4
      throw new Error('No implementado aún');
    },
    login: () => {
      // Se implementará en HU-S1.6
      throw new Error('No implementado aún');
    },
  },
};

module.exports = { resolvers };
