import mainClasses from './main-classes.json';

Object.values(mainClasses).forEach((mainClass: any) => {
  const subclasses: any = mainClass.subclasses;

  Object.entries(subclasses).forEach(([letter, caption]: any[]) => {
    subclasses[letter] = {
      caption,
      counts: {}
    };
  });

  mainClass.counts = {};
});

Object.defineProperty(mainClasses, 'clearCounts', {
  value: () => {
    Object.values(mainClasses).forEach((mainClass: any) => {
      Object.values(mainClass.subclasses).forEach((subclass: any) => {
        subclass.counts = {};
      });

      mainClass.counts = {};
    });
  }
});

export default mainClasses;
