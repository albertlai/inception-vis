const IMAGE_URLS = [
  { name: 'Cat', value: 'http://i.imgur.com/CzXTtJV.jpg' },
  { name: 'Dog', value: 'http://i.imgur.com/OB0y6MR.jpg' },
  { name: 'Cheetah', value: 'https://farm2.staticflickr.com/1533/26541536141_41abe98db3_z_d.jpg' },
  { name: 'Goldfish', value: 'https://farm2.staticflickr.com/1301/1349366952_982df2276f_z_d.jpg' },
  { name: 'Bird', value: 'https://farm4.staticflickr.com/3075/3168662394_7d7103de7d_z_d.jpg' },
  { name: 'Bridge', value: 'http://i.imgur.com/Bvke53p.jpg' },
  { name: 'Airplane', value: 'https://farm6.staticflickr.com/5590/14821526429_5c6ea60405_z_d.jpg' },
  { name: 'Cello', value: 'https://farm2.staticflickr.com/1090/4595137268_0e3f2b9aa7_z_d.jpg' },
  { name: 'Violin', value: 'https://farm6.staticflickr.com/5076/7175144508_e1ba0d6e35_z_d.jpg' },
  { name: 'Piano', value: 'https://farm4.staticflickr.com/3224/3081748027_0ee3d59fea_z_d.jpg' },
  { name: 'Apple', value: 'https://farm8.staticflickr.com/7377/9359257263_81b080a039_z_d.jpg' },
  { name: 'Orange', value: 'https://farm6.staticflickr.com/5251/5522940446_0d5724d43a_z_d.jpg' },
  { name: 'Flower', value: 'https://farm5.staticflickr.com/4037/4682037903_88cf1cfc47_z_d.jpg' },
  { name: 'Coffee', value: 'https://farm4.staticflickr.com/3752/9684880330_9b4698f7cb_z_d.jpg' },
  { name: 'Wine', value: 'https://farm4.staticflickr.com/3827/11349066413_99c32dee4a_z_d.jpg' }
];

var select = document.getElementById("image-urls");
for (i=0; i < IMAGE_URLS.length; i++) {
    let obj = IMAGE_URLS[i];
    let option = document.createElement("option");
    option.text = obj.name;
    option.value = obj.value;
    select.add(option);
    
}
