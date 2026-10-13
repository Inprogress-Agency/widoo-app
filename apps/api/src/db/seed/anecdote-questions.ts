/**
 * The eight anecdote questions at launch, word for word as Ecrans › E-09 lists them (D-026), in
 * the order of the sheet. Migration 0004 inserts the same rows: production needs them, and the
 * seed is refused there.
 */
export const anecdoteQuestionsAtLaunch = [
  { key: 'stroll_neighborhood', label: 'Mon quartier pour flâner' },
  { key: 'ideal_sunday', label: 'Ma sortie idéale un dimanche' },
  { key: 'hidden_gem', label: 'Un bon plan que personne ne connaît' },
  { key: 'best_memory', label: 'Mon meilleur souvenir à Paris' },
  { key: 'friends_visiting', label: "Là où j'emmène mes amis de passage" },
  { key: 'summer_must', label: 'Ce que je ne rate jamais en été' },
  { key: 'work_cafe', label: 'Mon café pour lire ou travailler' },
  { key: 'favorite_street', label: "Une rue que j'aime sans savoir pourquoi" },
].map((question, index) => ({ ...question, position: index + 1 }));
