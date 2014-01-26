bread.js
========

Performance timing library for front-end javascript using a slightly modified Zone.js

To use it by bootstrapping your javascript app with it:

    Bread.run(yourMainFn);

Within your code, you can call:

    //this marks this function and makes a note that is specifically
    //attributed to the timing of the function being called
    Bread.slice(someFn, "This function might be the problem");


    //the .note function can be peppered into to your code to
    //make notes that will be aligned with the timing (similar to
    //calling .slice, but it works within a function)
    Bread.note("Some note that's not at all contrived for the purposes of demonstration");