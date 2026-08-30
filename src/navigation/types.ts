/** Root stack param list.
 *
 * TeaForm doubles as both the "add" and "edit" screen: pass `photoUri`
 * when arriving from the camera (create mode) or `teaId` when arriving
 * from a library card tap (edit mode) -- never both.
 */
export type RootStackParamList = {
  Library: undefined;
  Camera: undefined;
  TeaForm: { photoUri: string; teaId?: undefined } | { teaId: string; photoUri?: undefined };
  Stats: undefined;
  Settings: undefined;
  Categories: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
