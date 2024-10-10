declare module 'translatte' {
  function translatte(text: string, options: { to: string }): Promise<{ text: string }>
  export default translatte
}
