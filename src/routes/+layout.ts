// The app is a pure client-side SPA: all data comes from user-selected seed
// nodes and browser state (localStorage), so nothing can render on the server.
export const ssr = false;

// Default header layout; areas that use the constrained, centered header
// (marketing, explore) override this in their own layout data.
export const load = () => {
  return { fullWidth: true };
};
