declare var pendo: {
  track: (event: string, properties?: Record<string, any>) => void;
  initialize: (options: Record<string, any>) => void;
  identify: (options: Record<string, any>) => void;
};
