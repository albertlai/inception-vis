const IMAGE_URLS = [
    { name: '-Pick an Image-', value: '' },
  { name: 'Cat', value: 'http://i.imgur.com/Tn1VjEp.jpg' },
  { name: 'Dog', value: 'http://i.imgur.com/8A3lses.jpg' },
  { name: 'Elephant', value: 'https://c1.staticflickr.com/8/7391/11330864553_dfc560ae6a.jpg' },
  { name: 'Goldfish', value: 'https://farm2.staticflickr.com/1301/1349366952_982df2276f_z_d.jpg' },
  { name: 'Bird', value: 'https://farm4.staticflickr.com/3075/3168662394_7d7103de7d_z_d.jpg' },
  { name: 'Bridge', value: 'https://c1.staticflickr.com/9/8232/8385101488_b101c9a9a7.jpg' },
  { name: 'Airplane', value: 'https://farm6.staticflickr.com/5590/14821526429_5c6ea60405_z_d.jpg' },
  { name: 'Violin', value: 'https://farm6.staticflickr.com/5076/7175144508_e1ba0d6e35_z_d.jpg' },
  { name: 'Piano', value: 'https://farm4.staticflickr.com/3224/3081748027_0ee3d59fea_z_d.jpg' },
  { name: 'Apple', value: 'https://c1.staticflickr.com/3/2110/2442762079_5c9549c8cb.jpg' },
  { name: 'Orange', value: 'https://c1.staticflickr.com/4/3228/2624653125_8b854d5e9a_b.jpg' },
  { name: 'Flower', value: 'https://farm5.staticflickr.com/4037/4682037903_88cf1cfc47_z_d.jpg' },
  { name: 'Burrito', value: 'https://c1.staticflickr.com/8/7064/6942547573_9fb88220e4.jpg' },
  { name: 'Coffee', value: 'https://farm4.staticflickr.com/3752/9684880330_9b4698f7cb_z_d.jpg' },
  { name: 'Wine', value: 'https://farm4.staticflickr.com/3827/11349066413_99c32dee4a_z_d.jpg' }
];

var select = document.getElementById("image-urls");
function loadURLs() {
    select.remove(0);
    for (i=0; i < IMAGE_URLS.length; i++) {
        let obj = IMAGE_URLS[i];
        let option = document.createElement("option");
        option.text = obj.name;
        option.value = obj.value;
        select.add(option);
    }
}
