module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run preview',
      url: ['http://localhost:4173'],
      numberOfRuns: 1
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
