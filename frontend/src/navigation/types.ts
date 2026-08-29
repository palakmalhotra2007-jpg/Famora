export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  JoinFamily: undefined;
};

export type FamilySetupParamList = {
  CreateFamily: undefined;
  JoinFamily: undefined;
};

export type HomeStackParamList = {
  HomeMain: undefined;
  Newspaper: undefined;
  Assistant: undefined;
};

export type FamilyTabParam =
  | 'games'
  | 'locations'
  | 'planner'
  | 'mailbox'
  | 'wall'
  | 'podcast'
  | 'bucket'
  | 'achievements';

export type MainTabParamList = {
  Home: undefined;
  Memories: undefined;
  Family: { tab?: FamilyTabParam } | undefined;
  Profile: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends AuthStackParamList {}
  }
}
