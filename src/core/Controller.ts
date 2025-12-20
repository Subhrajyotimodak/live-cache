import Collection from "./Collection";
import Document, { ModelType } from "./Document";

export default class Controller<TVariable, TName extends string> {
  public name: TName;
  public collection: Collection<TVariable, TName>;
  public loading: boolean = false;
  public error: any; // TODO: think about this.

  protected subscribers: Set<(model: ModelType<TVariable>) => void> = new Set();

  // initialises the value of collection
  public async initialise(): Promise<TVariable[]> {
    throw Error("Not Implemented");
  }

  public compoundKeyToObjectId(data: TVariable): string {
    throw Error("Not Implemented");
  }

  public publish(onChange: (data: ModelType<TVariable>) => void) {
    this.subscribers.add(onChange);
  }

  protected subscribe(model: ModelType<TVariable>) {
    this.subscribers.forEach((sub) => {
      sub(model);
    });
  }

  // revalidate from initializer
  public refetch() {
    this._initialise();
  }

  public invalidate(...data: TVariable[]) {
    const newValue = data.map(
      (x) => [this.compoundKeyToObjectId(x), x] as const,
    );

    for (const [key, value] of newValue) {
      const model = this.collection.findOneAndUpdate(key, value)?.toModel();
      if (model) {
        this.subscribe(model);
      }
    }
  }

  protected _initialise() {
    this.loading = true;
    this.initialise()
      .then((data) => {
        const documents = this.collection.insertMany(data);
        this.error = null;
        documents.forEach((doc) => {
          this.subscribe(doc.toModel());
        });
      })
      .catch((error) => {
        this.error = error;
      })
      .finally(() => {
        this.loading = false;
      });
  }

  constructor(name: TName) {
    this.collection = new Collection(name);
    this.loading = false;
    this._initialise();
    this.name = name;
  }
}

type User = {
  username: string;
};

class UserController extends Controller<User, "User"> {
  constructor() {
    super("User");
  }
}
