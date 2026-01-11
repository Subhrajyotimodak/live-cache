import Controller from "./Controller";

export default class ObjectStore {
  public store = new Map<string, Controller<any, any>>();

  register<TVariable, TName extends string>(
    controller: Controller<TVariable, TName>,
  ) {
    this.store.set(controller.name, controller);
  }

  get<TVariable, TName extends string>(name: TName) {
    const controller = this.store.get(name);

    if (!controller) {
      throw Error(`Controller with name ${name} is not registered`);
    }

    return controller as Controller<TVariable, TName>;
  }

  remove<TVariable, TName extends string>(name: TName) {
    this.store.delete(name);
  }

  initialise() {
    this.store.forEach((controller) => {
      controller.initialise();
    });
  }
}

const _objectStore = new ObjectStore();

export function getDefaultObjectStore() {
  return _objectStore;
}

export function createObjectStore() {
  return new ObjectStore();
}
