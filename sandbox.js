    function Person(name, age, gender){
        this.name = name;
        this.age = age;
        this.gender = gender;
    }

    Person.prototype.greet = function(){
        console.log(`Hello ${this.name}`);
    }

    let john = new Person("John", "55", "male");

    console.log(john);

    john.greet();

