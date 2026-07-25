// dcmjs ne fournit pas de types TypeScript officiels.
// Cette déclaration minimale évite les erreurs de compilation ;
// les objets renvoyés sont volontairement typés `any`.
declare module 'dcmjs' {
  const dcmjs: any;
  export = dcmjs;
}
