/**
 * Synchronous Auth Bridge
 * 
 * Used to prevent race conditions during OAuth transitions.
 * Since AsyncStorage is asynchronous, the root layout might redirect
 * before it has finished reading the 'is_signing_in' flag.
 * 
 * This global object provides a 0ms-latency signal that the
 * InitialLayout can check during its render phase.
 */
export const authBridge = {
  isSigningIn: false,
};
